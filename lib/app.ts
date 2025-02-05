export type ExpandableType<A, B> = A extends undefined ? B : {
    [K in keyof (A & B)]: K extends keyof B ? B[K] : K extends keyof A ? A[K] : never;
}

export type App<T> = {
    in: (path: string) => Pipeline<T>;
    start: (port?: number, ignoreFailedAssertions?: boolean) => void;
    export: (path?: string) => void;
    schema: () => object & {
        toText: () => string;
    }
};

export type UnshapenPipeline<T> = {
    shape<U>(shape: U): Pipeline<U>;
} & Pipeline<T>;

// ! type magic below, you spent hours on several iterations of this, only touch if necessary

type HardTypeToType<T> = T extends true ? boolean : T extends false ? boolean : T;

type IsUnion<T, U extends T = T> =
    (T extends any ?
        (U extends T ? false : T extends boolean ? false : true)
        : never) extends false ? false : true;

type IsUniformArray<T extends any[] | readonly any[]> = IsUnion<T[number]> extends true ? false : true;

type IsEmptyArray<T extends any[] | readonly any[]> = T[number] extends never ? true : false;
type IsArrayOfArray<T extends any[] | readonly any[]> = T[number] extends any[] | readonly any[] ? true : false;

type InferTypeUnionFromArray<T extends any[] | readonly any[]> = T extends (infer U)[] | readonly (infer U)[] ? U : never;
type UnionObject<T extends object> = {
    [K in keyof T]: DynamicAny<T[K]>;
}

type UnionArray<T extends any[] | readonly any[]> = IsUniformArray<T> extends false ? InferTypeUnionFromArray<T> : IsArrayOfArray<T> extends true ? InferTypeUnionFromArray<T> : InferTypeUnionFromArray<T>[];
type DynamicArray<T> = NoReadonly<T extends any[] | readonly any[] ? IsEmptyArray<T> extends false ? UnionArray<T> : any : T extends object ? DynamicObject<T> : HardTypeToType<T>>;
type DynamicObject<T extends object> = UnionObject<T>;
type DynamicAny<T> = T extends any[] | readonly any[] ? DynamicArray<T> : T extends object ? DynamicObject<T> : HardTypeToType<T>;

type NoReadonly<T> = T extends readonly (infer U)[] ? U[] :
    T extends object ? {
        -readonly [K in keyof T]: NoReadonly<T[K]>;
    } : T;

type StatusProtected<U> = [number, DynamicArray<U>] | DynamicArray<U>; 

export type Pipeline<T> = {
    where: (fn: (args: T) => boolean) => Pipeline<T>;
    do: (action: (args: T) => void) => Pipeline<T>;
    pass<U>(args: U): Pipeline<ExpandableType<T, U>>;
    transform<U>(fn: (args: T) => U): Pipeline<U>;
    batch: (allowBatching: boolean) => Pipeline<T>;
    close: () => StaticAssertable<WithSideEffects>;
    static<U>(result: U, shape?: U): StaticAssertable<WithSideEffects>;
    dynamic<U>(fn: (args: T) => StatusProtected<U>, shape?: U): DynamicAssertable<WithSideEffects>;
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

enum StatusCode {
    ClientErrorBadRequest = 400,
    ClientErrorConflict = 409,
    ClientErrorExpectationFailed = 417,
    ClientErrorFailedDependency = 424,
    ClientErrorForbidden = 403,
    ClientErrorGone = 410,
    ClientErrorImATeapot = 418,
    ClientErrorLengthRequired = 411,
    ClientErrorLocked = 423,
    ClientErrorLoginTimeOut = 440,
    ClientErrorMethodNotAllowed = 405,
    ClientErrorMisdirectedRequest = 421,
    ClientErrorNotAcceptable = 406,
    ClientErrorNotFound = 404,
    ClientErrorPayloadTooLarge = 413,
    ClientErrorPaymentRequired = 402,
    ClientErrorPreconditionFailed = 412,
    ClientErrorPreconditionRequired = 428,
    ClientErrorProxyAuthRequired = 407,
    ClientErrorRangeNotSatisfiable = 416,
    ClientErrorRequestHeaderFieldsTooLarge = 431,
    ClientErrorRequestTimeout = 408,
    ClientErrorRetryWith = 449,
    ClientErrorTooManyRequests = 429,
    ClientErrorUnauthorized = 401,
    ClientErrorUnavailableForLegalReasons = 451,
    ClientErrorUnprocessableEntity = 422,
    ClientErrorUnsupportedMediaType = 415,
    ClientErrorUpgradeRequired = 426,
    ClientErrorURITooLong = 414,
    InfoContinue = 100,
    InfoProcessing = 102,
    InfoSwitchingProtocols = 101,
    RedirectFound = 302,
    RedirectMovedPermanently = 301,
    RedirectMultipleChoices = 300,
    RedirectNotModified = 304,
    RedirectPermanent = 308,
    RedirectSeeOther = 303,
    RedirectSwitchProxy = 306,
    RedirectTemp = 307,
    RedirectUseProxy = 305,
    ServerErrorBadGateway = 502,
    ServerErrorBandwidthLimitExceeded = 509,
    ServerErrorGatewayTimeout = 504,
    ServerErrorHTTPVersionNotSupported = 505,
    ServerErrorInsufficientStorage = 507,
    ServerErrorInternal = 500,
    ServerErrorLoopDetected = 508,
    ServerErrorNetworkAuthRequired = 511,
    ServerErrorNotExtended = 510,
    ServerErrorNotImplemented = 501,
    ServerErrorServiceUnavailable = 503,
    ServerErrorVariantAlsoNegotiates = 506,
    SuccessAccepted = 202,
    SuccessAlreadyReported = 208,
    SuccessCreated = 201,
    SuccessIMUsed = 229,
    SuccessMultiStatus = 207,
    SuccessNoContent = 204,
    SuccessNonAuthoritativeInfo = 203,
    SuccessOK = 200,
    SuccessPartialContent = 206,
    SuccessResetContent = 205
}