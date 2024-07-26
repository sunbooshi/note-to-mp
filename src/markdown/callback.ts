import { PreviewSetting } from "src/settings";

export interface MDRendererCallback {
   settings: PreviewSetting;
   updateElementByID(id:string, html:string):void;
}