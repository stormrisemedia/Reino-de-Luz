# -*- coding: utf-8 -*-
from __future__ import annotations
import re
from pathlib import Path

root = Path(__file__).resolve().parents[1]

def u(s):
    return s.encode("ascii").decode("unicode_escape")

pages = {
    "index.html": {
        "title": "Reino de Luz | Kingdom of Light",
        "path": "/",
        "desc": u("Desde 2020, servimos a ni\\u00f1os y familias en uno de los distritos m\\u00e1s vulnerables de Iquitos \\u2014 formando vidas con el evangelio, talentos y esperanza."),
    },
    "about.html": {
        "title": u("Nosotros \\u00b7 Reino de Luz"),
        "path": "/about.html",
        "desc": u("Conoce la historia y el llamado de Reino de Luz en Iquitos, Per\\u00fa."),
    },
    "contacto.html": {
        "title": u("Contacto \\u00b7 Reino de Luz"),
        "path": "/contacto.html",
        "desc": u("Escr\\u00edbenos por WhatsApp o Facebook. Reino de Luz en Iquitos, Per\\u00fa."),
    },
    "donar.html": {
        "title": u("Donar \\u00b7 Reino de Luz"),
        "path": "/donar.html",
        "desc": u("Tu donaci\\u00f3n sostiene alimentaci\\u00f3n, talleres y el servicio a familias en Bel\\u00e9n, Iquitos."),
    },
    "en-vivo.html": {
        "title": u("En Vivo \\u00b7 Reino de Luz"),
        "path": "/en-vivo.html",
        "desc": u("Adoraci\\u00f3n, predicaci\\u00f3n y oraci\\u00f3n en vivo. Activa notificaciones para enterarte cuando estemos al aire."),
    },
    "galeria.html": {
        "title": u("Momentos \\u00b7 Reino de Luz"),
        "path": "/galeria.html",
        "desc": u("Cada foto es un testimonio de lo que Dios est\\u00e1 haciendo en Reino de Luz."),
    },
    "mision.html": {
        "title": u("Misi\\u00f3n \\u00b7 Reino de Luz"),
        "path": "/mision.html",
        "desc": u("Una generaci\\u00f3n transformada: visi\\u00f3n, pilares e impacto de Reino de Luz en Bel\\u00e9n, Iquitos."),
    },
    "programas.html": {
        "title": u("Programas \\u00b7 Reino de Luz"),
        "path": "/programas.html",
        "desc": u("Programas semanales de discipulado, talentos y formaci\\u00f3n para ni\\u00f1os y adolescentes."),
    },
}

def head_block(meta):
    site = "Reino de Luz"
    return (
        '<link rel="manifest" href="manifest.webmanifest"/>\n'
        '<link rel="apple-touch-icon" href="icons/apple-touch-icon.png?v=22"/>\n'
        '<link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png?v=22"/>\n'
        '<link rel="icon" type="image/png" sizes="512x512" href="icons/icon-512.png?v=22"/>\n'
        f'<meta name="description" content="{meta["desc"]}"/>\n'
        '<meta property="og:type" content="website"/>\n'
        f'<meta property="og:site_name" content="{site}"/>\n'
        '<meta property="og:locale" content="es_PE"/>\n'
        f'<meta property="og:url" content="https://reinodeluz.org{meta["path"]}"/>\n'
        f'<meta property="og:title" content="{meta["title"]}"/>\n'
        f'<meta property="og:description" content="{meta["desc"]}"/>\n'
        '<meta property="og:image" content="https://reinodeluz.org/share.jpg"/>\n'
        '<meta property="og:image:width" content="1200"/>\n'
        '<meta property="og:image:height" content="630"/>\n'
        f'<meta property="og:image:alt" content="{site}"/>\n'
        '<meta name="twitter:card" content="summary_large_image"/>\n'
        f'<meta name="twitter:title" content="{meta["title"]}"/>\n'
        f'<meta name="twitter:description" content="{meta["desc"]}"/>\n'
        '<meta name="twitter:image" content="https://reinodeluz.org/share.jpg"/>'
    )

# This script is only kept as a reference for regenerating meta; do not auto-run on current pages.
print("script updated for Reino de Luz naming")
