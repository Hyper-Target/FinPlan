# Exporta a PDF las hojas indicadas de un libro (para revisar el diseño). Uso:
#   powershell -File render_excel.ps1 -Ruta libro.xlsx -Pdf salida.pdf [-Hojas Resumen,Controles]
param(
    [Parameter(Mandatory = $true)][string]$Ruta,
    [Parameter(Mandatory = $true)][string]$Pdf,
    [string[]]$Hojas = @('Resumen')
)
$xl = New-Object -ComObject Excel.Application
$xl.Visible = $false; $xl.DisplayAlerts = $false
$wb = $xl.Workbooks.Open($Ruta)
try {
    $xl.CalculateFull()
    foreach ($h in $Hojas) {
        $destino = if ($Hojas.Count -eq 1) { $Pdf } else { $Pdf -replace '\.pdf$', "_$h.pdf" }
        $wb.Worksheets.Item($h).ExportAsFixedFormat(0, $destino)
    }
} finally { $wb.Close($false); $xl.Quit() }
