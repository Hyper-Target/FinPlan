"""Cliente HTTP común: timeout de 30 s y 3 reintentos con espera creciente.

Certificados: se intenta usar el almacén del sistema operativo (paquete `truststore`, recomendado:
`pip install truststore`) porque suameca.banrep.gov.co entrega la cadena de certificados incompleta y
`requests` falla con CERTIFICATE_VERIFY_FAILED aunque el navegador y curl sí funcionan. Si aun así falla y la
llamada lo permite (`permitir_ssl_inseguro=True`, solo para datos públicos de solo lectura), se reintenta sin
verificar el certificado y se deja una ADVERTENCIA que los scripts escriben en la hoja Fuentes del Excel.
"""
from __future__ import annotations

import time

import requests
import urllib3

try:  # opcional pero recomendado
    import truststore

    truststore.inject_into_ssl()
except Exception:  # noqa: BLE001
    pass

UA = {"User-Agent": "Mozilla/5.0 (PlanFin skills; educativo)"}
ADVERTENCIAS: list[str] = []  # avisos que los scripts vuelcan a la hoja Fuentes / al informe


class FuenteError(RuntimeError):
    """Error de descarga con un mensaje en español que dice qué hacer."""


def get(url: str, params: dict | None = None, *, timeout: int = 30, reintentos: int = 3,
        nombre_fuente: str = "fuente", permitir_ssl_inseguro: bool = False) -> requests.Response:
    """GET con reintentos. Levanta FuenteError si todos los intentos fallan.

    Un 404 no se reintenta: se devuelve tal cual para que el llamador decida (p. ej. el IPC del DANE).
    """
    ultimo: Exception | None = None
    verify = True
    for intento in range(1, reintentos + 1):
        try:
            r = requests.get(url, params=params, headers=UA, timeout=timeout, verify=verify)
            if r.status_code == 404:
                return r
            r.raise_for_status()
            return r
        except requests.exceptions.SSLError as e:
            ultimo = e
            if permitir_ssl_inseguro and verify:
                verify = False
                urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
                msg = (f"Certificado SSL no verificable en {nombre_fuente}; se consultó sin verificar (datos públicos "
                       "de solo lectura). Recomendado: pip install truststore.")
                if msg not in ADVERTENCIAS:
                    ADVERTENCIAS.append(msg)
                continue
            time.sleep(2 * intento)
        except requests.RequestException as e:
            ultimo = e
            if intento < reintentos:
                time.sleep(2 * intento)
    raise FuenteError(
        f"No se pudo consultar {nombre_fuente} ({url}) tras {reintentos} intentos: {ultimo}. "
        "Verifique la conexión a internet; si persiste, la fuente puede estar caída: repórtelo al usuario "
        "en lugar de inventar cifras."
    )
