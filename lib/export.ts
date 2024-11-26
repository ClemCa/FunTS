import { StatusCode } from "./auxiliary";
import { store } from "./internal";
import prompt from "prompt-sync";
import fs from "fs";

export function Export(path?: string) {
    const g = GenerateSchema();
    const tsString = SchemaToExport(g);
    path ??= prompt("Enter path to save schema to: ");
    if(!path || path.trim() === "") {
        console.log("Empty name: cancelled export");
        return;
    }
    let defaultName = "schema";
    const mode = path.indexOf("/") !== -1 ? "/" : "\\";
    if(path.substring(path.lastIndexOf(mode)+1).indexOf(".") !== -1) {
        defaultName = path.substring(path.lastIndexOf(mode)+1, path.lastIndexOf("."));
        path = path.substring(0, path.lastIndexOf(mode)+1);
    }
    console.log(defaultName);
    SaveWithDefault(path, tsString, defaultName, "ts");
    console.log("Exported schema to "+path);
}

export function GetSchema() {
    return GenerateSchema();
}

function SaveWithDefault(path: string, content: string, defaultName: string, extension: string) {
    if(path.endsWith("/") || path.endsWith("\\")) {
        path += defaultName;
    }
    if(!path.endsWith("."+extension)) {
        if(path.substring(path.lastIndexOf("/")+1).indexOf(".") !== -1) {
            path = path.substring(0, path.lastIndexOf("."));
        }
        path += "."+extension;
    }
    const dir = path.substring(0, path.lastIndexOf("/") !== -1 ? path.lastIndexOf("/") : path.lastIndexOf("\\"));
    if(!fs.existsSync(dir)) {
        fs.mkdirSync(dir, {recursive: true});
    }
    fs.writeFileSync(path, content);
}

function SchemaToExport(schema: object) {
    const schemaString = SchemaToString(schema, 1);
    return `enum StatusCode {\n   ${
        Object.entries(StatusCode).filter(([k, v]) => typeof v !== "string").map(([key, value]) => `${key} = ${value}`).join(",\n   ")
    }\n}\nexport type Schema = ${
        schemaString
    }\nconst raw = ${
        JSON.stringify(schema)
    }\ntype Raw<T> = object & {"::": {}}\nexport const schema = {
   ...raw,
   "::": {}
} as Raw<Schema>
export default schema`;
}

function SchemaToString(schema: object, level = 0) {
    /* ex: (only the tip of the branch is shown)
    {
        a: [{a: 0}, undefined],
        b: [{b: ""}, "status"],
    }
    =>
    {
        a: ({a: number}) => void
        b: ({b: string}) => [StatusCode, string]
    }
    */
    const entries = Object.entries(schema);
    const spaces = "   ".repeat(level);
    const result = `{\n${spaces}${
        entries.map(([key, value]) => {
            if (key.startsWith("$")) {
                if(key === "$") {
                    if(Array.isArray(value[0])) {
                        return "   $: [" + value.map((shape) => ConvertShapeToFunctionType(shape)).join(", ")+"]";
                    }
                    return `   $: ${ConvertShapeToFunctionType(value)}`;
                }
                return `   ${key}: ${ConvertShapeToFunctionType(value)}`;
            }
            return `   ${key}: ${SchemaToString(value, level+1)}`;
        }).join(",\n"+spaces)
    }\n${spaces}}`;
    return result;
}

function ConvertShapeToFunctionType(shape: [object, ReturnMode]) {
    const params = Object.entries(shape[0]).length === 0 ? "" : TypeFromShape(shape[0], true);
    switch (shape[1]) {
        case "void": return `(${params}) => void`;
        case "status": return `(${params}) => [StatusCode, string]`;
        case "unknown": return `(${params}) => unknown`;
        default: {
            const [returnType] = shape[1];
            return `(${params}) => ${TypeFromShape(returnType)}`;
        }
    }
}

type ReturnMode = "void" | "status" | "unknown" | [any];

function GenerateSchema() {
    const pipelines = store.get<Map<string, [string, any][][]>>("pipelines");
    const pipes = Array.from(pipelines.entries()).map(([path, group]) => {
        const shapes = group.map((pipeline) => {
            const shape = pipeline.find((p) => p[0] === "shape")?.[1] as object ?? {}
            const returnInfo = pipeline[pipeline.length - 1] as unknown as [string, any, any];
            if (returnInfo[0] === "close") {
                return [shape, "void"] as [object, ReturnMode];
            } else if (returnInfo[0] === "status") {
                return [shape, "status"] as [object, ReturnMode];
            } else {
                return [shape, typeof returnInfo[2] === "undefined" ? "unknown" : [returnInfo[2]]] as [object, ReturnMode];
            }
        })
            .filter((shape, i, arr) => arr.indexOf(shape) === i);
        if (path.startsWith("/")) {
            path = path.slice(1);
        }
        if(path.endsWith("/")) {
            path = path.slice(0, -1);
        }
        return [path, shapes] as [string, [object, ReturnMode][]];
    });
    return GroupByLevel(pipes);
}

function SafeName(name: string) {
    return IsNameSafe(name) ? name : `'${name}'`;
}

function IsNameSafe(name: string) {
    return /^[a-zA-Z_$][a-zA-Z_$0-9]*$/.test(name);
}

export function TypeFromShape<T extends object>(shape: T, includeBlanks = false): string {
    if (Array.isArray(shape)) {
        return `[${shape.map((s) => TypeFromShape(s, includeBlanks)).join(", ")}]`;
    }
    switch(typeof shape) {
        case "number":
        case "string":
        case "boolean":
        case "bigint":
            return typeof shape;
        case "object":
            break;
        case "function": throw new Error("Functions cannot be used over network");
    }
    const pairs = Object.entries(shape);
    const blanks = pairs.map(([key, value]) => {
        return SafeName(key);
    });
    const params = pairs.map(([key, value]) => {
        return `${SafeName(key)}: ${TypeFromShape(value, includeBlanks)}`;
    });
    if(includeBlanks) {
        return `{${blanks.join(", ")}}: {${params.join(", ")}}`;
    }
    return `{${params.join(", ")}}`;
}

function GroupByLevel(pipelines: [string, [object, ReturnMode][]][]) {
    const grouped = {};
    for (const [path, shapes] of pipelines) {
        const parts = path.split("/").filter((p) => p.length > 0);
        let current = grouped;
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (!current.hasOwnProperty(part)) {
                current[part] = {};
            }
            current = current[part];
        }
        let s = shapes.filter((shape, i, arr) => arr.findIndex((s) => s[0] === shape[0] && s[1] === shape[1]) === i);
        switch (s.length) {
            case 0: break;
            case 1: {
                current["$"] = s[0];
                break;
            }
            default: {
                current["$"] = s;
                for (const [i, shape] of s.entries()) {
                    current["$" + (i + 1)] = shape;
                }
                break;
            }
        }
    };
    return grouped;
}