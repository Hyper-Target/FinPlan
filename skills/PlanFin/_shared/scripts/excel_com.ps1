# Validación genérica de un libro con Excel (COM, solo Windows con Excel instalado).
#  1. recalcula todo y lee los nombres definidos pedidos en -Nombres (celdas únicas);
#  2. si se da -Ajuste "Nombre=valor", cambia esa entrada, recalcula y vuelve a leer los mismos nombres;
#  3. cuenta las celdas con error de fórmula en todo el libro;
#  4. con -Guardar deja guardados los valores calculados.
# Escribe un JSON UTF-8 en -Salida:  { disponible, base:{...}, ajuste:{...}, Errores }
param(
    [Parameter(Mandatory = $true)][string]$Ruta,
    [Parameter(Mandatory = $true)][string]$Salida,
    [Parameter(Mandatory = $true)][string]$Nombres,
    [string]$Ajuste = '',
    [switch]$Guardar
)
$ErrorActionPreference = 'Stop'
function Escribir($obj) { $obj | ConvertTo-Json -Compress -Depth 5 | Set-Content -Path $Salida -Encoding UTF8 }

try { $xl = New-Object -ComObject Excel.Application }
catch { Escribir @{ disponible = $false; motivo = 'Excel no está instalado' }; exit 0 }

$xl.Visible = $false
$xl.DisplayAlerts = $false
$wb = $null
try {
    $wb = $xl.Workbooks.Open($Ruta)
    $xl.CalculateFull()
    $lista = $Nombres.Split(',') | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' }
    function Leer() {
        $h = @{}
        foreach ($n in $lista) {
            $v = $wb.Names.Item($n).RefersToRange.Value2
            if ($v -is [double] -or $v -is [int]) { $h[$n] = [double]$v } else { $h[$n] = [string]$v }
        }
        return $h
    }
    $res = @{ disponible = $true }
    $res.base = Leer
    if ($Ajuste -ne '') {
        $par = $Ajuste.Split('=')
        $celda = $wb.Names.Item($par[0]).RefersToRange
        $orig = $celda.Value2
        $celda.Value2 = [double]::Parse($par[1], [System.Globalization.CultureInfo]::InvariantCulture)
        $xl.CalculateFull()
        $res.ajuste = Leer
        $celda.Value2 = $orig
        $xl.CalculateFull()
    }
    $errores = 0
    foreach ($ws in $wb.Worksheets) {
        try { $errores += $ws.UsedRange.SpecialCells(-4123, 16).Count } catch { }
    }
    $res.Errores = $errores
    if ($Guardar) { $wb.Save() }
    Escribir $res
}
catch { Escribir @{ disponible = $false; motivo = $_.Exception.Message } }
finally {
    if ($wb) { $wb.Close($false) }
    $xl.Quit()
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($xl)
}
