import { Store } from "./lib/store";
import { Express, json } from "express";
import { EmptyPipeline } from "./lib/pipeline";
import { ProcessPipeline } from "lib/processing";
import { RunAsserts } from "lib/assertions";
import { store } from "lib/internal";

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

export function GetExpress() {
    return app.get();
}

function StartApp(port: number = 3000, ignoreFailedAssertions: boolean = false) {
    if(RunAsserts() === false && !ignoreFailedAssertions) {
        throw new Error("Failed assertions");
    }
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
    expressApp.listen(port, () => {
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
