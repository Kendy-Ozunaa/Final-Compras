import { useEffect } from "react";
import { login, saveToken } from "../api/auth";
// import { printAuxId } from "../utils/debugAux";

export default function AutoLogin({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    async function doLogin() {
      // LOGIN AUTOMÁTICO
      const token = await login("compras_user", "ISO815810");
      saveToken(token);

      // LUEGO IMPRIMIMOS EL AUXILIARY ID
      // printAuxId(); 
    }

    doLogin();
  }, []);

  return <>{children}</>;
}
