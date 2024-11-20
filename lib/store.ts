type Element<T> = {
    value: T;
} & Partial<Extension<T>>;

type Extension<T> = {
    cleanUp: () => void;
    update: (value: T) => void;
    validate: (value: T) => boolean;
}

class Fragment<T> {
    private __internal: string;
    private __store: Store;
    constructor(fragment: string, store: Store) {
        this.__internal = fragment;
        this.__store = store;
    }
    get() {
        return this.__store.get<T>(this.__internal);
    }
    set(value: T | ((value: T | undefined) => T)) {
        this.__store.set(this.__internal, value);
    }
    extend(extension: Extension<T>) {
        this.__store.extend(this.__internal, extension);
    }
    extension(extension: keyof Extension<T>) {
        return this.__store.extension(this.__internal, extension);
    }
    do(action: (value: T) => void) {
        const value = this.get();
        if(value === undefined) {
            throw new Error("Value does not exist");
        }
        action(value);
    }
    try(action: (value: T) => void) {
        const value = this.get();
        if(value === undefined) {
            return;
        }
        action(value);
    }
}

export class Store {
    private __internal = new Map<string, Element<any>>();
    new<T>(key: string, value: T): Fragment<T | undefined> {
        this.set(key, value);
        return new Fragment<T | undefined>(key, this);
    }
    has(key: string): boolean {
        return this.__internal.has(key);
    }
    get<T>(key: string): T | undefined {
        const element = this.__internal.get(key);
        return element?.value;
    }
    set<T>(key: string, value: T | ((value: T | undefined) => T)): void {
        if(this.__internal.has(key)) {
            const element = this.__internal.get(key);
            element?.cleanUp();
        }
        if(typeof value === "function") {
            // @ts-ignore
            value = value(this.get<T>(key));
        }
        this.__internal.set(key, {
            value,
            cleanUp: () => {},
            update: (value: T) => {
                this.set(key, value);
            }
        });
    }
    extend<T>(key: string, extension: Extension<T>): void {
        const element = this.__internal.get(key);
        if(element === undefined) {
            throw new Error("Key does not exist");
        }
        this.__internal.set(key, {
            ...element,
            ...extension
        });
    }
    extension<T>(key: string, extension: keyof Extension<T>) {
        const element: Element<T> = this.__internal.get(key);
        if(element === undefined) {
            throw new Error("Key does not exist");
        }
        if(element[extension] === undefined) {
            throw new Error("Extension was not created");
        }
        return element[extension] as Extension<T>[typeof extension];
    };
}