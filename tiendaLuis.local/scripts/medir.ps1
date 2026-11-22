param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("antes", "durante", "despues")]
    [string]$Fase,

    [string]$Url = "http://localhost:8088/health"
)

$salida = Join-Path $PSScriptRoot "..\docs\capturas\tiempos.csv"
$resultados = for ($i = 1; $i -le 10; $i++) {
    $reloj = [System.Diagnostics.Stopwatch]::StartNew()
    $estado = 200
    $nodo = "sin respuesta"

    try {
        $respuesta = Invoke-RestMethod -Uri $Url -TimeoutSec 10
        $nodo = $respuesta.nodo
    }
    catch {
        $estado = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
        $nodo = $_.Exception.Message
    }

    $reloj.Stop()
    [pscustomobject]@{
        fase = $Fase
        peticion = $i
        estado = $estado
        nodo = $nodo
        tiempo_ms = [math]::Round($reloj.Elapsed.TotalMilliseconds, 2)
        fecha = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    }
}

if (Test-Path $salida) {
    $resultados | Export-Csv -Path $salida -NoTypeInformation -Append -Encoding utf8
}
else {
    $resultados | Export-Csv -Path $salida -NoTypeInformation -Encoding utf8
}

$resultados | Format-Table -AutoSize
Write-Host "Resultados acumulados en $salida"
