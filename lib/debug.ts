export function LogReturn<T>(value: T, ...args): T {
    console.log(...args, value);
    return value;
}