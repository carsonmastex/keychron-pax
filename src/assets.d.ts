declare module "*.png" {
  const url: string;
  export default url;
}

/** True only in `PAX_DEBUG=1 node pax/build.mjs` test builds. */
declare const __DEBUG__: boolean;
