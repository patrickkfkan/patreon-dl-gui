import type { TypeOptions } from "react-toastify";
import { toast } from "react-toastify";

export function showToast(type: TypeOptions, message: string) {
  toast(message, {
    type,
    autoClose: 3000,
    position: "bottom-center",
    theme: "dark"
  });
}
