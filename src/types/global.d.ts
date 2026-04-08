export {};

declare global {
  interface Window {
    Fingerprint: any;
    WebSdk: any;
    sha1: any;
    sjcl: any;
    BigInteger: any;
  }

  const Fingerprint: any;
  const WebSdk: any;
}