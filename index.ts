import { Store } from "@lib/store";
import { Express, Request, Response, json } from "express";
import { EmptyPipeline } from "@lib/pipeline";

const store = new Store();
const userStore = new Store();

const app = store.new<Express>("app", undefined);
const pipelines = store.new("pipelines", new Map<string, any[]>());

export function GetStore() {
    return userStore;
}

export function CreateApp() {
    if (app.get() !== undefined) {
        throw new Error("App already exists");
    }
    app.set(require('express')());
    return EmptyPipeline(RegisterPipeline, StartApp);
}

function StartApp() {
    const expressApp = app.get();
    if (expressApp === undefined) {
        throw new Error("App does not exist");
    }
    const allPipelines = pipelines.get();
    if(allPipelines.size === 0) {
        throw new Error("No pipelines registered");
    }
    expressApp.use(json());
    allPipelines.forEach((pipelineGroup, path) => {
        expressApp.post(path, (req, res) => {
            let matched = false;
            pipelineGroup.forEach((p) => {
                if(!matched && ProcessPipeline(p, req, res)) {
                    matched = true;
                }
            });
            if(matched) return;
            res.status(404).send("Not found");
        });
    });
    expressApp.listen(3000, () => {
        console.log("Server started");
    });
}

function RegisterPipeline(__value: any) {
    pipelines.update((v) => {
        v = (v ?? new Map<string, any[]>());
        const group = v.get(__value.in) ?? [];
        group.push(__value.pipeline);
        v.set(__value.in, group);
        return v;
    });
}

function ProcessPipeline(__value: [string, any][], req: Request, res: Response) {
    const body = req.body;
    const result = __value.length === 0 || PipelineStep(__value, 0, body);
    if(result) {
        if(Array.isArray(result)) {
            res.status(result[0]).send(result[1]);
            return true;
        }
        if(result === true) {
            res.status(200).send("OK");
            return true;
        }
        res.send(result);
        return true;
    }
    return false;
}

function PipelineStep(pipeline: [string, any][], step: number, body: object) {
    if(step === pipeline.length) {
        console.error("Unclosed pipeline", pipeline);
        return false;
    }
    const [action, value] = pipeline[step];
    if(action === "where") {
        const result = value(body);
        if(result) {
            return PipelineStep(pipeline, step + 1, body);
        }
        return false;
    }
    switch(action) {
        case "do":
            value(body);
            return PipelineStep(pipeline, step + 1, body);
        case "pass":
            return PipelineStep(pipeline, step + 1, {...body, ...value});
        case "transform":
            return PipelineStep(pipeline, step + 1, value(body));
        case "shape":
            if(!CheckShape(value, body)) return false;
            return PipelineStep(pipeline, step + 1, body);
        case "static":
            return value;
        case "dynamic":
            return value(body);
        case "close":
            return true;
        case "status":
            return value;
    };
    console.error("Unhandled action", action);
    return false;
}

function CheckShape(value: object, body: object) {
    for(const key in value) {
        if(!(key in body)) {
            return false;
        }
        if(typeof value[key] !== typeof body[key]) {
            return false;
        }
    }
    return true;
}