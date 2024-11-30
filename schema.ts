enum StatusCode {
   InfoContinue = 100,
   InfoSwitchingProtocols = 101,
   InfoProcessing = 102,
   SuccessOK = 200,
   SuccessCreated = 201,
   SuccessAccepted = 202,
   SuccessNonAuthoritativeInfo = 203,
   SuccessNoContent = 204,
   SuccessResetContent = 205,
   SuccessPartialContent = 206,
   SuccessMultiStatus = 207,
   SuccessAlreadyReported = 208,
   SuccessIMUsed = 229,
   RedirectMultipleChoices = 300,
   RedirectMovedPermanently = 301,
   RedirectFound = 302,
   RedirectSeeOther = 303,
   RedirectNotModified = 304,
   RedirectUseProxy = 305,
   RedirectSwitchProxy = 306,
   RedirectTemp = 307,
   RedirectPermanent = 308,
   ClientErrorBadRequest = 400,
   ClientErrorUnauthorized = 401,
   ClientErrorPaymentRequired = 402,
   ClientErrorForbidden = 403,
   ClientErrorNotFound = 404,
   ClientErrorMethodNotAllowed = 405,
   ClientErrorNotAcceptable = 406,
   ClientErrorProxyAuthRequired = 407,
   ClientErrorRequestTimeout = 408,
   ClientErrorConflict = 409,
   ClientErrorGone = 410,
   ClientErrorLengthRequired = 411,
   ClientErrorPreconditionFailed = 412,
   ClientErrorPayloadTooLarge = 413,
   ClientErrorURITooLong = 414,
   ClientErrorUnsupportedMediaType = 415,
   ClientErrorRangeNotSatisfiable = 416,
   ClientErrorExpectationFailed = 417,
   ClientErrorImATeapot = 418,
   ClientErrorMisdirectedRequest = 421,
   ClientErrorUnprocessableEntity = 422,
   ClientErrorLocked = 423,
   ClientErrorFailedDependency = 424,
   ClientErrorUpgradeRequired = 426,
   ClientErrorPreconditionRequired = 428,
   ClientErrorTooManyRequests = 429,
   ClientErrorRequestHeaderFieldsTooLarge = 431,
   ClientErrorLoginTimeOut = 440,
   ClientErrorRetryWith = 449,
   ClientErrorUnavailableForLegalReasons = 451,
   ServerErrorInternal = 500,
   ServerErrorNotImplemented = 501,
   ServerErrorBadGateway = 502,
   ServerErrorServiceUnavailable = 503,
   ServerErrorGatewayTimeout = 504,
   ServerErrorHTTPVersionNotSupported = 505,
   ServerErrorVariantAlsoNegotiates = 506,
   ServerErrorInsufficientStorage = 507,
   ServerErrorLoopDetected = 508,
   ServerErrorBandwidthLimitExceeded = 509,
   ServerErrorNotExtended = 510,
   ServerErrorNetworkAuthRequired = 511
}
export type Schema = {
      $: [({a, b, c}: {a: number, b: number, c: number}) => string, () => [StatusCode, string]],
      $1: ({a, b, c}: {a: number, b: number, c: number}) => string,
      $2: () => [StatusCode, string],
      noshape: {
         $: () => [StatusCode, string]
      },
      test: {
         $: () => ({a: number, b: number} | {c: number, b: number})
      },
      test2: {
         $: [() => {a: number, b: number}, () => {a: [number, number], b: {a: [number], b: number}}],
         $1: () => {a: number, b: number},
         $2: () => {a: [number, number], b: {a: [number], b: number}}
      },
      test3: {
         $: () => [1, 2, 3]
      },
      test4: {
         $: () => [number]
      },
      test5: {
         $: [() => any, () => number[], () => (boolean | number), () => [boolean, number][]],
         $1: () => any,
         $2: () => number[],
         $3: () => (boolean | number),
         $4: () => [boolean, number][]
      },
      test6: {
         $: () => {a: boolean}
      }
   }
const raw = {"$":[[{"a":0,"b":0,"c":0},[""]],[{},"status"]],"$1":[{"a":0,"b":0,"c":0},[""]],"$2":[{},"status"],"noshape":{"$":[{},"status"]},"test":{"$":[{},["clemDyn",[{"a":0,"b":0},{"c":0,"b":0}]]]},"test2":{"$":[[{},[{"a":0,"b":0}]],[{},[{"a":[0,0],"b":{"a":[0],"b":0}}]]],"$1":[{},[{"a":0,"b":0}]],"$2":[{},[{"a":[0,0],"b":{"a":[0],"b":0}}]]},"test3":{"$":[{},["[1, 2, 3]"]]},"test4":{"$":[{},["[number]"]]},"test5":{"$":[[{},["clemDyn",[]]],[{},[[0]]],[{},["clemDyn",[false,0]]],[{},[[[false,0]]]]],"$1":[{},["clemDyn",[]]],"$2":[{},[[0]]],"$3":[{},["clemDyn",[false,0]]],"$4":[{},[[[false,0]]]]},"test6":{"$":[{},[{"a":false}]]}}
type Raw<T> = object & {"::": {}}
export const schema = {
   ...raw,
   "::": {}
} as Raw<Schema>
export default schema