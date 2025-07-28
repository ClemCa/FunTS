import { Request, Response } from "express";

export async function ProcessPipeline(__value: [string, any][], req: Request, res: Response) {
    const body = req.body;
    const result = __value.length === 0 ? true : await PipelineStep(__value, 0, body);
    if (result) {
        if (Array.isArray(result)) {
            if(typeof result[0] === "number")
            {
                res.status(result[0]).send(result[1]);
                return true;
            }
            else {
                console.error("FunTS does not explicitely support sending naked arrays as responses, as it will try to interpret the first element as a status code.")
            }
        }
        if (result === true) {
            res.status(200).send("OK");
            return true;
        }
        res.send(result);
        return true;
    }
    return false;
}

export async function ProcessPipelineBatch(pipelineGroup: [string, any][], req: Request, res: Response) {
    const bodies = req.body as any[];
    const results = await Promise.all(
        bodies.map((body: any) => pipelineGroup.length === 0 || StepGroup(pipelineGroup, body))
    );
    console.log("results", results);
    if(results.every((x: any) => !x)) return false;

    if(results.every((x: any) => x === true)) {
        res.status(200).send("OK");
        return true;
    }
    if(results.every((x: any) => Array.isArray(x))) {
        const statusCodes = results.map((x: any) => x[0]);
        if(statusCodes.every((x: any[]) => typeof x === "number")) {
            const allStatuses = (statusCodes as any[]).map((x: any[]) => x[0] as number).reduce((arr, x) => { if(arr.includes(x)) return arr; arr.push(x); return arr; }, []);
            if(allStatuses.length === 1) {
                res.status(allStatuses[0]).send(results.map((x: any[]) => x[1]));
                return true;
            }
            res.status(200).send(results.map((x: any[]) => x)); // needs status codes to be dealt with on the client side
            return true;
        } else {
            console.error("FunTS does not explicitely support sending naked arrays as responses, as it will try to interpret the first element as a status code.")
        }
    }
    res.status(200).send(results); // client side needs to deal with the responses
    return true;
}

async function StepGroup(group, body) {
    for (const pipeline of group) {
        const result = await PipelineStep(pipeline, 0, body);
        if (result) {
            return result;
        }
    }
    return false;
}

export async function PipelineStep(pipeline: [string, any][], step: number, body: object, stopAt?: number, returnBody?: boolean, noSideEffects?: boolean) {
    function exit(value: any) {
        if (!returnBody) {
            return value;
        }
        return [value, body];
    }
    if (stopAt && step >= stopAt) {
        return ["stopped", body];
    }
    if (step === pipeline.length) {
        console.error("Unclosed pipeline", pipeline);
        return false;
    }
    const [action, value] = pipeline[step];
    if (action === "where") {
        const result = value(body);
        if (result) {
            return await PipelineStep(pipeline, step + 1, body, stopAt, returnBody, noSideEffects);
        }
        return exit(false);
    }
    switch (action) {
        case "do":
            if(!noSideEffects) {
                await value(body);
            }
            return await PipelineStep(pipeline, step + 1, body, stopAt, returnBody, noSideEffects);
        case "pass":
            return await PipelineStep(pipeline, step + 1, { ...body, ...value }, stopAt, returnBody, noSideEffects);
        case "transform":
            return await PipelineStep(pipeline, step + 1, value(body), stopAt, returnBody, noSideEffects);
        case "shape":
            if (!CheckShape(value, body)) return false;
            return await PipelineStep(pipeline, step + 1, body, stopAt, returnBody, noSideEffects);
        case "static":
            return exit(value);
        case "dynamic":
            return exit(await value(body));
        case "close":
            return exit(true);
        case "status":
            return exit(value);
    };
    console.error("Unhandled action", action);
    return exit(false);
}

function CheckShape(value: object, body: object) {
    for (const key in value) {
        if (!(key in body)) {
            return false;
        }
        if (typeof value[key] !== typeof body[key]) {
            return false;
        }
    }
    return true;
}