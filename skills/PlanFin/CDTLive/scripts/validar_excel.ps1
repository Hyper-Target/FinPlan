# Recalcula el libro con Excel (COM), lee cifras clave, prueba que al duplicar el Monto todo se recalcula
# y, con -Guardar, deja los valores calculados guardados en el archivo. Escribe un JSON UTF-8 en -Salida.
param(
    [Parameter(Mandatory = $true)][string]$Ruta,
    [Parameter(Mandatory = $true)][string]$Salida,
    [switch]$Guardar
)
$ErrorActionPreference = 'Stop'
function Escribir($obj) { $obj | ConvertTo-Json -Compress | Set-Content -Path $Salida -Encoding UTF8 }

try { $xl = New-Object -ComObject Excel.Application }
catch { Escribir @{ disponible = $false; motivo = 'Excel no está instalado' }; exit 0 }

$xl.Visible = $false
$xl.DisplayAlerts = $false
$wb = $null
try {
    $wb = $xl.Workbooks.Open($Ruta)
    $xl.CalculateFull()
    function N($nombre) { $wb.Names.Item($nombre).RefersToRange.Value2 }
    $lo = $wb.Worksheets.Item('Simulacion').ListObjects.Item('TSimulacion')
    $sumaNeto = 0.0; foreach ($v in $lo.ListColumns.Item('InteresNeto').DataBodyRange.Value2) { $sumaNeto += [double]$v }
    $sumaRent = 0.0; foreach ($v in $lo.ListColumns.Item('RentNetaEA').DataBodyRange.Value2) { $sumaRent += [double]$v }
    $res = @{
        disponible = $true
        MejorEntidad = [string](N 'MejorEntidad')
        TasaMejor = [double](N 'TasaMejor')
        MejorInteresNeto = [double](N 'MejorInteresNeto')
        RentRealMejor = [double](N 'RentRealMejor')
        SumXfd = [double](N 'SumXfd')
        ValidaXfd = [string](N 'ValidaXfd')
        ModeloOK = [string](N 'ModeloOK')
        SumaInteresNeto = $sumaNeto
        SumaRentNetaEA = $sumaRent
    }
    # Prueba de sensibilidad: duplicar el monto debe duplicar el interés neto
    $celdaMonto = $wb.Names.Item('Monto').RefersToRange
    $orig = [double]$celdaMonto.Value2
    $celdaMonto.Value2 = $orig * 2
    $xl.CalculateFull()
    $res.InteresNetoMonto2x = [double](N 'MejorInteresNeto')
    $celdaMonto.Value2 = $orig
    $xl.CalculateFull()
    # Celdas con error de fórmula en todo el libro
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
