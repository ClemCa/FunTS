import { StatusCode } from "./auxiliary";
import { store } from "./internal";
import prompt from "prompt-sync";
import fs from "fs";
import { LogReturn } from "./debug";

export function Export(path?: string) {
    const g = GenerateSchema();
    const tsString = SchemaToExport(g);
    path ??= prompt("Enter path to save schema to: ");
    if (!path || path.trim() === "") {
        console.log("Empty name: cancelled export");
        return;
    }
    let defaultName = "schema";
    const currentWorkingDir = process.cwd();
    const mode = currentWorkingDir.indexOf("/") !== -1 ? "/" : "\\";
    if (path.substring(path.lastIndexOf(mode) + 1).indexOf(".") !== -1) {
        defaultName = path.substring(path.lastIndexOf(mode) + 1, path.lastIndexOf("."));
        path = path.substring(0, path.lastIndexOf(mode) + 1);
    }
    SaveWithDefault(path, tsString, defaultName, "ts", mode);
}

export function GetSchema() {
    return DeClemDyn(GenerateSchema());
}

function SaveWithDefault(path: string, content: string, defaultName: string, extension: string, mode: '/' | '\\') {
    if (path.endsWith(mode) || path.trim() === "") {
        path += defaultName;
    }
    if (!path.endsWith("." + extension)) {
        if (path.substring(path.lastIndexOf(mode) + 1).indexOf(".") !== -1) {
            path = path.substring(0, path.lastIndexOf("."));
        }
        path += "." + extension;
    }
    const dir = path.substring(0, path.lastIndexOf(mode));
    if (dir.trim() !== "" && !fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(path, content);
    console.log("Exported schema to " + path);
}

function SchemaToExport(schema: object) {
    const schemaString = SchemaToString(schema, 1);
    return `enum StatusCode {\n   ${Object.entries(StatusCode).filter(([k, v]) => typeof v !== "string").map(([key, value]) => `${key} = ${value}`).join(",\n   ")
        }\n}\nexport type Schema = ${schemaString
        }\nconst raw = ${JSON.stringify(DeClemDyn(schema)).replace('"StatusCode.SuccessOK"', "StatusCode.SuccessOK")
        }\nexport const schema = {
   ...raw,
   "::": {}
} as unknown as Schema;
export default schema`;
}

function DeClemDyn(value: any, in$ = false) {
    if (typeof value === "object") {
        if (Array.isArray(value)) {
            if (value.length === 2 && value[0] === "clemDyn") {
                return DeDyn(value[1]);
            }
            return value.map((v) => DeClemDyn(v, in$));
        }
        return Object.fromEntries(Object.entries(value).map(([key, value]) => {
            if (key.startsWith("$") && typeof value === "object" && !Array.isArray(value[0])) {
                if (!Array.isArray(value[1])) {
                    return [key, DeClemDyn(value[1], true)];
                } else if (value[1][0] !== "clemDyn") {
                    return [key, DeClemDyn(value[1][0], true)];
                }
            }
            return [key, DeClemDyn(value, key.startsWith("$") || in$)];
        }));
    }
    if (in$) {
        return StaticDedyn(value);
    }
    return value;
}

function StaticDedyn(value: unknown) {
    /*
    possibilities:
    - [1, 2, 3]
    - [number]
    - number[]
    - (boolean | number)[]
    - "static string"
    */
    if (typeof value === "string") {
        if (value.startsWith('"')) {
            return value.slice(1, -1);
        }
        if (value.startsWith("[")) {
            if (value.indexOf(",") !== -1) {
                return value.slice(1, -1).split(", ").map((v) => StaticDedyn(v));
            }
            return [StaticDedyn(value.slice(1, -1))];
        }
        if (value.endsWith("[]")) {
            return [StaticDedyn(value.slice(0, -2))];
        }
        if (value.startsWith("(")) {
            const vals = value.slice(1, -1).split(" | ").map((v) => StaticDedyn(v));
            if (vals.length === 1) {
                return vals[0];
            }
            return vals;
        }
        switch (value) {
            case "number": return 0;
            case "boolean": return false;
            case "string": return "";
            case "undefined": return undefined;
            case "any": return null;
            case "null": return null;
            case "true": return true;
            case "false": return false;
            case "unknown": return null;
        }
        if (!isNaN(Number(value))) {
            return Number(value);
        }
        if (value === "status") {
            return "StatusCode.SuccessOK";
        }
        console.warn("Unknown static value: " + value);
    }
    if (typeof value === "number" || typeof value === "boolean") {
        return value;
    }
    console.warn("Unhandled type in raw: ", typeof value, "(", value, ")");
    return value;
}

function DeDyn(value: any) {
    if (typeof value === "object") {
        if (Array.isArray(value)) {
            if (value.length === 0) return null;
            if (value.length === 1) {
                return [];
            }
            return DeDyn(value[0]); // first is default
        }
        return Object.fromEntries(Object.entries(value).map(([key, value]) => {
            return [key, DeDyn(value)];
        }));
    }
    return value;
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
    const result = `{\n${spaces}${entries.map(([key, value]) => {
        if (key.startsWith("$")) {
            if (key === "$") {
                if (Array.isArray(value[0])) {
                    return "   $: [" + value.map((shape) => ConvertShapeToFunctionType(shape)).join(", ") + "]";
                }
                return `   $: ${ConvertShapeToFunctionType(value)}`;
            }
            return `   ${key}: ${ConvertShapeToFunctionType(value)}`;
        }
        return `   ${key}: ${SchemaToString(value, level + 1)}`;
    }).join(",\n" + spaces)
        }\n${spaces}}`;
    if (result.indexOf("=> unknown") !== -1) {
        const count = result.match(/=> unknown/g).length;
        console.warn(`Warning: ${count} return types in the schema are unknown`);
    }
    return result;
}

function ConvertShapeToFunctionType(shape: [object, ReturnMode]) {
    const params = Object.entries(shape[0]).length === 0 ? "" : TypeFromShape(shape[0], true);
    switch (shape[1]) {
        case "void": return `(${params}) => void`;
        case "status": return `(${params}) => [StatusCode, string]`;
        case "unknown": return `(${params}) => unknown`;
        default: { // ! there's likely a bug hiding here, especially in the dynamic part
            if (shape[1][0] === "clemDyn") {
                const variants = shape[1][1];
                if (!Array.isArray(variants)) {
                    return `(${params}) => ${TypeFromShape(variants, undefined, true)}`;
                }
                if (variants.length === 0) {
                    return `(${params}) => any`;
                }
                if (variants.length === 1) {
                    if (Array.isArray(variants[0])) {
                        return `(${params}) => (${variants[0].map((v) => TypeFromShape(v))
                            .reduce((acc, curr) => { if (acc.indexOf(curr) === -1) { acc.push(curr); } return acc; }, [])
                            .join(" | ")})[]`;
                    }
                    return `(${params}) => ${TypeFromShape(variants[0], undefined, true)}[]`;
                }
                return `(${params}) => (${variants.map((v) => TypeFromShape(v, undefined, true))
                    .reduce((acc, curr) => { if (acc.indexOf(curr) === -1) { acc.push(curr); } return acc; }, [])
                    .join(" | ")})`;
            }
            const [returnType] = shape[1];
            if (Array.isArray(returnType)) {
                if (returnType.length === 1) {
                    return `(${params}) => ${TypeFromShape(returnType[0])}[]`;
                } else if (returnType.length === 0) {
                    return `(${params}) => any[]`;
                }
            }
            return `(${params}) => ${TypeFromShape(returnType)}`;
        }
    }
}

type ReturnMode = "void" | "status" | "unknown" | [any] | ["clemDyn", any];

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
            } else if (returnInfo[0] === "dynamic") {
                if (returnInfo[2] === undefined) {
                    return [shape, "unknown"] as [object, ReturnMode];
                }
                return [shape, ["clemDyn", returnInfo[2]]] as [object, ReturnMode];
            } else {
                return [shape, typeof returnInfo[2] === "undefined" ? "unknown" : [returnInfo[2]]] as [object, ReturnMode];
            }
        })
            .filter((shape, i, arr) => arr.indexOf(shape) === i);
        if (path.startsWith("/")) {
            path = path.slice(1);
        }
        if (path.endsWith("/")) {
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

export function TypeFromShape<T extends object>(shape: T, includeBlanks = false, dynamicMode = false, wrapString = false): string {
    if (Array.isArray(shape)) {
        if (dynamicMode) {
            if (shape.length === 0) {
                return "any";
            }
            if (shape.length === 1) {
                return TypeFromShape(shape[0], includeBlanks, dynamicMode) + "[]";
            }
            return shape.map((s) => TypeFromShape(s, includeBlanks, dynamicMode))
                .reduce((acc, curr) => { if (acc.indexOf(curr) === -1) { acc.push(curr); } return acc; }, [])
                .join(" | ");
        }
        return `[${shape.map((s) => TypeFromShape(s, includeBlanks, dynamicMode)).join(", ")}]`;
    }
    switch (typeof shape) {
        case "number":
            if (shape !== 0) {
                return (shape as number).toString();
            }
        case "boolean":
        case "bigint":
            return typeof shape;
        case "string":
            if ((shape as string).trim() === "") {
                return "string";
            }
            if (wrapString || dynamicMode) {
                return `"${shape}"`;
            }
            return shape;
        case "object":
            break;
        case "function": throw new Error("Functions cannot be used over network");
        case "undefined": return "undefined";
        default: throw new Error("Unsupported type: " + typeof shape);
    }
    const pairs = Object.entries(shape);
    const blanks = pairs.map(([key, value]) => {
        return SafeName(key);
    });
    const params = pairs.map(([key, value]) => {
        return `${SafeName(key)}: ${TypeFromShape(value, includeBlanks, dynamicMode)}`;
    });
    if (includeBlanks) {
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