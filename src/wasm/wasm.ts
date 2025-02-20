import AssetsManager from "../assets";
require('./wasm_exec.js');

declare class Go {
  argv: string[];
  env: { [envKey: string]: string };
  exit: (code: number) => void;
  importObject: WebAssembly.Imports;
  exited: boolean;
  mem: DataView;
  run(instance: WebAssembly.Instance): Promise<void>;
}

declare function GoWebpToJPG(data: ArrayBuffer): ArrayBuffer;
declare function GoWebpToPNG(data: ArrayBuffer): ArrayBuffer;

let WasmLoaded = false;

export function IsWasmReady() {
    return WasmLoaded;
}

export async function LoadWasm() {
    if (WasmLoaded) {
        return;
    }
    const assets = AssetsManager.getInstance();
    const wasmContent = await assets.loadWasm();

    if (!wasmContent) {
      console.error('WASM content not found');
      // throw new Error('WASM content not found');
      return;
    }
    const go = new Go();
    const ret = await WebAssembly.instantiate(wasmContent, go.importObject);
    go.run(ret.instance);
    WasmLoaded = true;
}

export function WebpToJPG(data: ArrayBuffer): ArrayBuffer {
    return GoWebpToJPG(new Uint8Array(data));
}

export function WebpToPNG(data: ArrayBuffer): ArrayBuffer {
    return GoWebpToPNG(data);
}