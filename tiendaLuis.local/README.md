## Arquitectura preparada

`docker-compose.yml` construye tres copias de la API real de inventario (`nodo1`, `nodo2`, `nodo3`) y las conecta a la red privada `clusternet` (`172.20.0.0/24`, con IP fija `.11`, `.12` y `.13` como en la Clase 33). Nginx (servicio `lb`) sirve la página real `frontend/index.html` y distribuye las rutas `/api/` y `/health` entre las tres copias. Es el único servicio que publica un puerto del equipo: `8088`. Use `/health` para ver qué nodo respondió. Compose comprueba la salud de cada API con `wget`; Nginx reintenta una petición si una conexión falla y deja temporalmente de elegir ese nodo.

## Ensayo en Windows 11

1. Abra Docker Desktop y espere a que indique que Docker está iniciado. Abra PowerShell en la carpeta `tiendaLuis.local` de este proyecto.
2. Revise la configuración y arranque los cuatro contenedores:

   ```powershell
   docker compose config
   docker compose up -d --build
   docker compose ps
   ```

   Espere a que `nodo1`, `nodo2` y `nodo3` indiquen `healthy` y `lb` indique `Up`. Tome aquí la captura de los tres nodos saludables. Si `docker compose config` muestra error, vuelva a abrir PowerShell en `tiendaLuis.local`.

   Para confirmar que es la aplicación de inventario, abra `http://localhost:8088` en el navegador (debe verse la página de Tienda Luis) y luego consulte `Invoke-RestMethod http://localhost:8088/api/productos/1 | ConvertTo-Json`. Debe mostrar un producto real del archivo `data/productos.json`.

3. Compruebe la red privada `clusternet` y los puertos publicados:

   ```powershell
   docker network inspect clusternet
   docker compose exec nodo1 wget -qO- http://nodo2:7000/health
   docker compose exec nodo1 wget -qO- http://172.20.0.13:7000/health
   docker compose ps
   ```

   En `inspect`, los tres nodos aparecen con sus IP `172.20.0.11`, `.12` y `.13`. La segunda orden debe imprimir JSON con `"nodo":"nodo2"` y la tercera con `"nodo":"nodo3"`: la comunicación entre nodos funciona por nombre y por IP privada. En `docker compose ps`, solo `lb` debe mostrar un puerto en `PORTS`, como `0.0.0.0:8088->80/tcp`; los nodos no publican ninguno.

4. Haga las diez solicitudes iniciales:

   ```powershell
   .\scripts\medir.ps1 -Fase antes
   ```

   Deben aparecer códigos `200` y los nombres de los nodos rotando en la tabla. Tome una captura de esas respuestas. El script agrega nodo, estado y tiempo en milisegundos a `docs\capturas\tiempos.csv`.

   Si PowerShell bloquea el script con un error de directivas de ejecución, ejecute una sola vez `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` (o lance el script con `powershell -ExecutionPolicy Bypass -File .\scripts\medir.ps1 -Fase antes`).

5. Detenga un nodo y repita las diez solicitudes:

   ```powershell
   docker compose stop nodo2
   docker compose ps -a
   .\scripts\medir.ps1 -Fase durante
   ```

   Las diez deben responder `200` desde `nodo1` o `nodo3`. Tome una captura del estado detenido y otra de las respuestas. La primera solicitud puede tardar algo más mientras Nginx detecta la conexión fallida.

6. Encienda `nodo2` de nuevo:

   ```powershell
   docker compose start nodo2
   docker compose ps
   Start-Sleep -Seconds 8
   ```

   Espere a que `nodo2` aparezca `healthy`. La pausa adicional deja pasar el tiempo en que Nginx recuerda el nodo caído (`fail_timeout`); luego haga las diez solicitudes finales y tome la captura:

   ```powershell
   .\scripts\medir.ps1 -Fase despues
   ```

   Deben responder `200` y `nodo2` debe volver a aparecer en la rotación. Al terminar el ensayo, cierre el clúster con `docker compose down`.

Guarde las capturas reales en `docs/capturas`. Abra `tiempos.csv` en Excel para comparar antes, durante y después. Si repite el ensayo para la evidencia final, borre primero el `tiempos.csv` de pruebas anteriores. El repositorio incluye el lugar para las capturas, pero no trae evidencias de ejecución Docker.

Health Checks, Pruebas de Failover y Documentación

### Implementación del Endpoint /health
Para monitorear la disponibilidad real de cada instancia del backend dentro del clúster, se implementó un health check activo mediante la ruta GET /health en Express (src/index.ts):

* *Operación normal (HTTP 200 OK):* Devuelve un estado 200 junto con un objeto JSON que indica "estado": "Health", la marca de tiempo (timeStamp) y el identificador del contenedor que atendió la petición (os.hostname()), permitiendo verificar el balanceo de carga entre nodos.
* *Simulación de fallos (HTTP 503 Service Unavailable):* El endpoint soporta el parámetro opcional ?simular=falla. Al activarse, retorna un código 503 ("estado": "No Health") para comprobar cómo Docker detecta el fallo y cómo Nginx (proxy_next_upstream) redirige el tráfico hacia los nodos saludables sin afectar al usuario final.
