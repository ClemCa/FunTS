import { pipeline } from "./pipeline";
import { ProcessPipeline, ProcessPipelineBatch } from "./processing";
import { Request, Response } from "express";

export async function HandleBatch(allPipelines: Map<string, pipeline>, req: any, res: any) {
    const body = req.body;
    if (!body || !Array.isArray(body) || body.some((x: any) => !Array.isArray(x) || typeof x[0] !== "string")) {
        res.status(400).send("Invalid body");
        return;
    }
    console.log("batch", body);
    const results = await Promise.all(body.map(async (body: any, index) => {
        const path = body[0];
        if(path === "/batch/" || path === "/batch" || path === "batch/" || path === "batch") {
            let resValue = [400, "Internal error in nested batch"];
            const myRes = {
                status: (code: number) => ({
                    send: (value: any) => {
                        resValue = [code, value];
                    }
                }),
                send: (value: any) => {
                    resValue = [200, value];
                }
            };
            await HandleBatch(allPipelines, body[1], myRes);
            return resValue;
        }
        const pipelineGroup = allPipelines.get(path) || allPipelines.get("/" + path) || allPipelines.get(path + "/") || allPipelines.get("/" + path + "/") || allPipelines.get(path.replace(/\/$/, ""));
        if (!pipelineGroup) {
            console.log("Couldn't find pipeline for", path);
            return [404, "Not found"];
        }
        const singleBatched = body[2];
        let resValue;
        const myRes = {
            status: (code: number) => ({
                send: (value: any) => {
                    resValue = [code, value];
                }
            }),
            send: (value: any) => {
                resValue = [200, value];
            }
        } as Response;
        if(singleBatched) {
            resValue = [400, "Internal error in nested batch"];
            await ProcessPipelineBatch(pipelineGroup, { body: body[1] } as Request, myRes)
            return resValue;
        }
        resValue = [404, "Not found"];
        for (const p of pipelineGroup) {
            if(await ProcessPipeline(p, { body: body[1] } as Request, myRes)) {
                return resValue;
            }
        }
        return resValue;
    }));
    console.log("results", results);
    res.status(200).send(results); // no need for teapot, as we never expect the same status code
}