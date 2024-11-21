export type ExpandableType<A, B> = A extends undefined ? B : {
    [K in keyof (A & B)]: K extends keyof B ? B[K] : K extends keyof A ? A[K] : never;
}

export type App<T> = {
    in: (path: string) => Pipeline<T>;
};

export type UnshapenPipeline<T> = {
    shape<U>(shape: U): Pipeline<U>;
} & Pipeline<T>;

export type Pipeline<T> = {
    where: (fn: (args: T) => boolean) => Pipeline<T>;
    do: (action: (args: T) => void) => Pipeline<T>;
    pass<U>(args: U): Pipeline<ExpandableType<T, U>>;
    transform<U>(fn: (args: T) => U): Pipeline<U>;
    close: () => StaticAssertable<WithSideEffects>;
    static: (result: any) => StaticAssertable<WithSideEffects>;
    dynamic: (fn: (args: T) => any) => DynamicAssertable<WithSideEffects>;
    status: (code: number, message: string) => StaticAssertable<WithSideEffects>;
};

export type StaticAssertable<T extends (WithSideEffects | NoSideEffects)> = { // close, static, status
    accepted(entry: any): StaticAssertable<T>;
    inspect(entry: any, step: number, body: any): StaticAssertable<T>;
    rejected(entry: any, body?: any): StaticAssertable<T>;
} & (T extends WithSideEffects ? {
    withoutDo: () => StaticAssertable<NoSideEffects>;
} : {
    withDo: () => StaticAssertable<WithSideEffects>;
});


export type DynamicAssertable<T extends (WithSideEffects | NoSideEffects)> = {
    accepted(entry: any, exit: any): DynamicAssertable<T>;
    inspect(entry: any, step: number, body: any): DynamicAssertable<T>;
    rejected(entry: any, body?: any): DynamicAssertable<T>;
} & (T extends WithSideEffects ? {
    withoutDo: () => DynamicAssertable<NoSideEffects>;
} : {
    withDo: () => DynamicAssertable<WithSideEffects>;
});

export type WithSideEffects = false
export type NoSideEffects = true