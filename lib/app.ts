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
    close: () => void;
    static: (result: any) => void;
    dynamic: (fn: (args: T) => any) => void;
    status: (code: number, message: string) => void;
};
