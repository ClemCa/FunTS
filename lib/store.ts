type Element<T> = {
    value: T;
} & Partial<Extension<T>>;

type Extension<T> = {
    cleanUp: () => void;
    update: (value: T, ...args: any) => T;
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
    update(fn: (value: T) => T) {
        return this.__store.update(this.__internal, fn);
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
    set<T>(key: string, value: T): void {
        if(this.__internal.has(key)) {
            const element = this.__internal.get(key);
            element?.cleanUp();
        }
        this.__internal.set(key, {
            value,
            cleanUp: () => {},
            update: (value: T) => {
                this.set(key, value);
            }
        });
    }
    update<T>(key: string, fn: (value: T) => T) {
        if(this.__internal.has(key)) {
            const element = this.__internal.get(key);
            element?.cleanUp();
        }
        const element = this.__internal.get(key);
        element.value = fn(element.value);
        this.__internal.set(key, element);
        return element.value;
    }
}