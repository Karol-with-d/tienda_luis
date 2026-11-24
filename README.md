# Tienda Luis — Inventario en Alta Disponibilidad

Backend de inventario (Express + TypeScript) servido a través de un **clúster de
3 nodos** detrás de un **balanceador Nginx con HTTPS**, tolerancia a fallos y
monitoreo de salud. Checkpoint 3 — Gestión de Servidores Web.

## Estructura del repositorio

```text
tienda_luis/
├── README.md                  <- este archivo (guía de ejecución)
├── image.png / image-1.png    <- evidencias HTTPS de la Fase 2
└── tiendaLuis.local/
    ├── docker-compose.yml     <- orquestación: 3 nodos + balanceador lb
    ├── Dockerfile             <- imagen del backend (node:20-alpine)
    ├── nginx/nginx.conf       <- upstream + HTTPS + redirect + proxy
    ├── apache/                <- certificado SSL y conf de Apache (Fase 2)
    ├── frontend/index.html    <- sitio estático "Tienda Luis"
    ├── src/                   <- API Express en TypeScript (puerto 7000)
    ├── data/productos.json    <- inventario compartido entre nodos
    ├── scripts/medir.ps1      <- script de pruebas de balanceo
    └── docs/capturas/         <- evidencias del clúster
```

## Arquitectura

```text
Usuario (navegador / curl)
   │
   │   https://localhost        <- entrada HTTPS (puerto 443)
   │   http://localhost:8088    <- redirige automáticamente a HTTPS
   ▼
[ lb: Nginx ]                    único servicio publicado hacia afuera
   │   red privada clusternet (172.30.0.0/24)
   │
   ├──> nodo1  172.30.0.11:7000 ┐
   ├──> nodo2  172.30.0.12:7000 ├── carpeta compartida ./data (inventario)
   └──> nodo3  172.30.0.13:7000 ┘
```

## Guía de ejecución (paso a paso)

### Requisitos previos

- **Docker Desktop** (o Docker Engine + Compose en Linux)
- **Git**
- **mkcert** — para generar el certificado HTTPS

> **Importante:** la llave privada del certificado **no está en el repositorio**
> por seguridad (`.gitignore` excluye `*-key.pem`). Sin ella el balanceador no
> arranca; el Paso 1 la genera en menos de un minuto.

### Paso 0 — Clonar y ubicarse

```powershell
git clone https://github.com/Karol-with-d/tienda_luis.git
cd tienda_luis/tiendaLuis.local
```

### Paso 1 — Generar el certificado SSL

Instale mkcert (`winget install FiloSottile.mkcert` en Windows, `brew install
mkcert` en macOS o `sudo apt install mkcert` en Ubuntu) y desde la carpeta
`tiendaLuis.local` ejecute:

```powershell
mkcert -install
mkcert -key-file apache/tienda-luis.local+3-key.pem -cert-file apache/tienda-luis.local.pem tienda-luis.local localhost 127.0.0.1 ::1
```

Esto crea la llave privada en `apache/` (queda fuera de git) e instala la CA en
el equipo para que el navegador muestre el candado **sin advertencias**.

### Paso 2 — Construir la imagen del backend

```powershell
docker build -t tiendaluis-api .
```

### Paso 3 — Levantar el clúster

```powershell
docker compose up -d
```

### Paso 4 — Verificar

```powershell
docker compose exec lb nginx -t     # "syntax is ok / test is successful"
docker compose ps                    # lb Up; nodo1, nodo2, nodo3 Up (healthy)
```

### Paso 5 — Acceder

| URL | Resultado esperado |
|---|---|
| `http://localhost:8088` | **301 →** `https://localhost` (redirección automática) |
| `https://localhost` | Sitio "Tienda Luis" con **candado, sin advertencias** |
| `https://localhost/api/productos` | JSON del inventario vía balanceador |
| `https://localhost/health` | Repita la petición: rota `nodo1 → nodo2 → nodo3` |

Round Robin desde PowerShell:

```powershell
1..6 | ForEach-Object { (Invoke-RestMethod https://localhost/health).nodo }
```

O con el script incluido (10 peticiones con nodo, estado y tiempo):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\medir.ps1 -Fase antes
```

### Paso 6 — Prueba de failover (alta disponibilidad)

```powershell
docker compose stop nodo2
powershell -ExecutionPolicy Bypass -File .\scripts\medir.ps1 -Fase durante
# el servicio sigue respondiendo 200 con nodo1 y nodo3

docker compose start nodo2
powershell -ExecutionPolicy Bypass -File .\scripts\medir.ps1 -Fase despues
# nodo2 vuelve a la rotación
```

### Apagar

```powershell
docker compose down       # el inventario queda en ./data
```

### Problemas comunes

| Síntoma | Causa y solución |
|---|---|
| `lb` en `Exited` / `cannot load certificate key` | Falta la llave privada → repita el **Paso 1** |
| Advertencia de certificado en el navegador | No corrió `mkcert -install` (instala la CA en el equipo) |
| `not a directory` al levantar | Faltaba `nginx/nginx.conf` y Docker creó una carpeta → `docker compose down`, borre `nginx/nginx.conf` (carpeta) y cree el archivo |
| Puerto `8088` o `443` ocupado | Cambie el lado izquierdo del mapeo en `docker-compose.yml` |

Documentación por fase:

- **[tiendaLuis.local/fase3.md](tiendaLuis.local/fase3.md)** — clúster de 3
  nodos, balanceador Nginx, HTTPS, evidencias y prueba de failover con capturas.
- **[tiendaLuis.local/fase2.md](tiendaLuis.local/fase2.md)** — Fase 2
  (histórico): Apache + ProxyPass + HTTPS y evidencias del candado.
