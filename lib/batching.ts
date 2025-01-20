import { pipeline } from "./pipeline";
import { ProcessPipeline, ProcessPipelineBatch } from "./processing";
import { Response } from "express";

export function HandleBatch(allPipelines: Map<string, pipeline>, req: any, res: any) {
    if (!req.body || !Array.isArray(req.body) || req.body.some((x: any) => !Array.isArray(x) || typeof x[0] !== "string")) {
        res.status(400).send("Invalid body");
        return;
    }
    console.log("batch", req.body);
    const results = req.body.map((body: any) => {
        const path = body[0];
        if(path === "/batch/" || path === "/batch") {
            let resValue = [400, "Internal error in nested batch"];
            const myRes = {
                status: (code: number) => ({
                    send: (value: any) => {
                        resValue = [code, value];
                    }
                })
            };
            HandleBatch(allPipelines, body[1], myRes);
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
            })
        } as Response;
        if(singleBatched) {
            resValue = [400, "Internal error in nested batch"];
            ProcessPipelineBatch(pipelineGroup, req, myRes)
            return resValue;
        }
        resValue = [404, "Not found"];
        for (const p of pipelineGroup) {
            if(ProcessPipeline(p, req, myRes)) {
                return resValue;
            }
        }
        return resValue;
    });
    res.status(200).send(results); // no need for teapot, as we never expect the same status code
}