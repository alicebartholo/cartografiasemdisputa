#!/usr/bin/env python3
"""Cartografias em Disputa — servidor local alternativo (Python 3, macOS/Linux/Windows).
Uso:  python3 server.py   (abre em http://localhost:8080)"""
import json, os, re, shutil, sys, time, webbrowser
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

BASE = os.path.dirname(os.path.abspath(__file__))
ALLOWED = {'data/pontos.geojson', 'atlas/atlas.json'}

class H(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=BASE, **k)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def _json(self, code, obj):
        b = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(code); self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(b))); self.end_headers(); self.wfile.write(b)

    def do_GET(self):
        if urlparse(self.path).path == '/api/status':
            return self._json(200, {'ok': True, 'servidor': 'python'})
        return super().do_GET()

    def do_POST(self):
        u = urlparse(self.path); n = int(self.headers.get('Content-Length', 0)); body = self.rfile.read(n)
        try:
            if u.path == '/api/salvar':
                o = json.loads(body.decode('utf-8')); rel = o.get('arquivo')
                if rel not in ALLOWED: return self._json(403, {'ok': False, 'erro': 'arquivo não permitido'})
                full = os.path.join(BASE, rel)
                if os.path.exists(full):
                    os.makedirs(os.path.join(BASE, '_backup'), exist_ok=True)
                    shutil.copy(full, os.path.join(BASE, '_backup', os.path.basename(full) + time.strftime('.%Y%m%d_%H%M%S.bak')))
                with open(full, 'w', encoding='utf-8') as f: f.write(o.get('conteudo', ''))
                print('  salvo:', rel); return self._json(200, {'ok': True})
            if u.path == '/api/upload':
                nome = parse_qs(u.query).get('nome', ['imagem.jpg'])[0]
                nome = re.sub(r'[^A-Za-z0-9._-]', '_', nome).lower()
                stem, ext = os.path.splitext(nome)
                if ext not in ('.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'): return self._json(400, {'ok': False, 'erro': 'formato não suportado'})
                os.makedirs(os.path.join(BASE, 'media'), exist_ok=True)
                final, i = nome, 1
                while os.path.exists(os.path.join(BASE, 'media', final)): final = f'{stem}-{i}{ext}'; i += 1
                with open(os.path.join(BASE, 'media', final), 'wb') as f: f.write(body)
                print('  imagem: media/' + final); return self._json(200, {'ok': True, 'caminho': 'media/' + final})
            return self._json(404, {'ok': False, 'erro': 'rota desconhecida'})
        except Exception as e:
            return self._json(500, {'ok': False, 'erro': str(e)})

    def log_message(self, *a):
        pass

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    srv = ThreadingHTTPServer(('localhost', port), H)
    print(f'\n  Cartografias em Disputa — servidor em http://localhost:{port}/  (Ctrl+C para encerrar)\n')
    if '--no-browser' not in sys.argv:
        try: webbrowser.open(f'http://localhost:{port}/')
        except Exception: pass
    srv.serve_forever()
