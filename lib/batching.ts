import { pipeline } from "./pipeline";
import { PipelineStep } from "./processing";

export function HandleBatch(allPipelines: Map<string, pipeline>, req: any, res: any) {
    if (!req.body || !Array.isArray(req.body) || req.body.some((x: any) => !Array.isArray(x) || typeof x[0] !== "string")) {
        res.status(400).send("Invalid body");
        return;
    }
    console.log("batch", req.body);
    const results = req.body.map((body: any) => {
        const path = body[0];
        const pipelineGroup = allPipelines.get(path) || allPipelines.get("/" + path) || allPipelines.get(path + "/") || allPipelines.get("/" + path + "/") || allPipelines.get(path.replace(/\/$/, ""));
        if (!pipelineGroup) {
            console.log("Couldn't find pipeline for", path);
            return [404, "Not found"];
        }
        const res = pipelineGroup.length === 0 || PipelineStep(pipelineGroup, 0, body);
        if (res) {
            return res;
        }
        return [404, "Not found"];
    });
    res.status(200).send(results); // no need for teapot, as we never expect the same status code
}