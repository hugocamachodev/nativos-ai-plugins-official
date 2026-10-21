# Publicar cada vuelta en una dirección de prueba

Para medir una vuelta hay que publicarla: en la computadora los números no sirven. Y nunca
en la dirección de verdad: esa la publica la persona, cuando ella decida.

## 1 · Antes de la primera vuelta: cómo se va a publicar

Revisa dos cosas, sin preguntar:

- **¿La página vive en Cloudflare?** Hay un `wrangler.jsonc`, `wrangler.json` o
  `wrangler.toml` en la carpeta, o la página respondió con `server: cloudflare`.
- **¿Hay sesión de Cloudflare?** `npx wrangler whoami`. Si dice que no hay sesión, o
  falla, no la hay.
- **¿La carpeta está en GitHub?** `git remote -v` apunta a `github.com`, y `gh auth status`
  dice si puedes leer el repositorio.

Luego pregunta una sola vez, y espera la respuesta:

> Para medir cada vuelta necesito publicarla en una dirección de prueba, sin tocar tu
> página de verdad. ¿Cómo quieres?
> 1. **Cloudflare directo:** yo la publico desde aquí, siempre en la misma dirección:
>    `https://<nombre>-prueba.<tu-subdominio>.workers.dev`. Es lo más rápido.
> 2. **Con GitHub:** subo los arreglos a una rama aparte, Cloudflare arma solo una vista
>    previa de esa rama y yo busco la liga. Sirve si tu página ya se publica sola cuando
>    subes a GitHub.
> 3. **Tú la publicas** como prefieras y me pasas la liga.

- La 1 solo se ofrece si la página vive en Cloudflare y pasa el punto 2 de abajo. La 2,
  si además la carpeta está en GitHub. Si no, ofrece las que sí apliquen y di en una línea
  por qué faltan las otras.
- Si eligen la 1 y no hay sesión, explica y espera:
  > Antes hay que conectar Claude con tu Cloudflare. Se hace una sola vez: en la Terminal
  > corre `npx wrangler login`, se abre el navegador, revisa que sea tu cuenta y pica
  > **Allow**. Avísame cuando esté.

  Después confirma con `npx wrangler whoami`. No corras `wrangler login` tú: el permiso lo
  da la persona.

## 2 · Qué se puede publicar con la opción 1

Solo una carpeta de archivos que ya están hechos (HTML, CSS, JavaScript, imágenes): lo que
sale de Vite, de un Astro estático o una página hecha a mano.

**No publiques con la opción 1** si la configuración de Cloudflare tiene `main` (código que
corre en el servidor) o cualquier conexión a datos (`kv_namespaces`, `d1_databases`,
`r2_buckets`, `durable_objects`, `services`, `queues`, `vars`, `secrets`). La copia de
prueba podría escribir en los datos de verdad. Dilo así y ofrece la opción 2.

## 3 · Opción 1: cómo se publica cada vuelta con Cloudflare directo

La configuración del proyecto no se toca. La prueba usa una configuración propia, en una
carpeta temporal, sin dominios ni rutas: así nunca se queda con el dominio de verdad.

1. **El nombre.** `<nombre>-prueba`, donde `<nombre>` es el `name` de la configuración de
   Cloudflare (o el de la carpeta, en minúsculas y con guiones). Siempre el mismo en todas
   las vueltas: nunca uno nuevo por vuelta.
2. **¿Ya existe?** `npx wrangler deployments list --name <nombre>-prueba`. Si existe y no
   lo creaste tú en esta conversación, pregunta antes: publicar ahí lo reemplaza.
3. **Compila la rama de la vuelta** a una carpeta temporal nueva (Vite:
   `npx vite build --outDir "$t/dist" --emptyOutDir`, con `t=/tmp/mide-velocidad/prueba-$(date +%Y%m%d-%H%M%S)`;
   ve `references/carpeta.md` §3). Nunca a `dist/`, `build/` ni `.next/` del proyecto.
4. **La configuración de la prueba**, en `"$t/wrangler.jsonc"`:

   ```jsonc
   {
     "name": "<nombre>-prueba",
     "compatibility_date": "<la misma del proyecto>",
     "workers_dev": true,
     "assets": { "directory": "./dist" }
   }
   ```

   Si el proyecto trae `not_found_handling` o `html_handling` dentro de `assets`, cópialos.
   Nada más: ni `routes`, ni `route`, ni dominios.
5. **El OK, antes de la primera publicación:**
   > Voy a publicar la vuelta 1 en `https://<nombre>-prueba.<subdominio>.workers.dev`. Tu
   > página de verdad no cambia. ¿Le doy?

   El silencio no es un sí. Ese OK vale para las siguientes vueltas en la misma dirección;
   en cada una, avisa en una línea qué cambió antes de publicar.
6. **Publica:** `cd "$t" && npx wrangler deploy`. La liga sale al final de lo que imprime.
7. **Revisa que la de verdad no cambió:** pídela y confirma que trae los mismos archivos
   con huella que en la primera medición (`index-xFrKbF9T.js` y compañía).
8. **Mide la dirección de prueba** con esta misma skill. Sirve desde el mismo Cloudflare
   que la de verdad, así que la comparación es justa.

## 4 · Opción 2: cómo se publica cada vuelta con GitHub

Cada vez que se sube una rama que no es la que publica, Cloudflare la compila y le da una
vista previa en `workers.dev`, sin tocar la página de verdad. Para eso el Worker tiene que
estar conectado a GitHub (Workers Builds) y tener `workers.dev` prendido.

1. **La rama.** La de los arreglos, siempre la misma en todas las vueltas. Nunca la que
   publica: si no sabes cuál es, pregúntala (está en Cloudflare → el Worker → **Settings** →
   **Build** → **Branch control**).
2. **El OK, antes del primer envío:**
   > Voy a subir la rama `<rama>` a GitHub. No es la que publica tu página, así que la de
   > verdad no cambia: Cloudflare solo arma una vista previa. ¿Le doy?

   Ese OK vale para las siguientes vueltas en la misma rama; en cada una, avisa en una
   línea qué cambió.
3. **Sube:** `git push -u origin <rama>`. Cloudflare tarda uno o dos minutos en compilar.
4. **La liga.** Búscala en lo que Cloudflare le reporta a GitHub sobre ese commit:
   `gh api repos/<dueño>/<repo>/commits/$(git rev-parse HEAD)/check-runs --jq '.check_runs[] | {name, status, details_url, summary: .output.summary}'`.
   Si hay un pull request de esa rama, Cloudflare también deja la liga en un comentario.
   Espera a que diga que terminó. Si no la encuentras, pídesela a la persona: Cloudflare →
   el Worker → **Deployments**, la versión de esa rama.
   - Si no aparece ninguna compilación de la rama, las vistas previas están apagadas: la
     persona las prende en **Settings** → **Build** → **Branch control** → **Enable Preview
     Builds**. No las prendas tú.
5. **Revisa que la de verdad no cambió** y **mide la vista previa**, igual que en los
   pasos 7 y 8 de la opción 1.

## 5 · Al terminar

La persona decide cuándo se publica de verdad, y se publica como siempre lo hace (por
ejemplo, subiendo a la rama que publica Cloudflare). Tú no la publicas sin que te lo pida.

Cierra con la lista de lo que creaste, y ofrece borrarlo:

> Para estas pruebas creé:
> - la rama `<rama>`, con los arreglos;
> - la dirección de prueba `https://<nombre>-prueba.<subdominio>.workers.dev` (opción 1)
>   o la rama `<rama>` en GitHub (opción 2);
> - la carpeta temporal `<t>`.
>
> ¿Lo borro? Si vas a seguir mejorando la página, conviene dejarlo.

Con su sí: `npx wrangler delete --name <nombre>-prueba` (opción 1) o
`git push origin --delete <rama>` (opción 2). La rama local solo se borra si ya se publicó
o si la persona lo pide.
