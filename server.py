import http.server
import socketserver
import json
import os
import base64
import subprocess
import time

PORT = 8088

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Disable caching for development
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        super().end_headers()

    def do_POST(self):
        if self.path == '/api/save-html':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                payload = json.loads(post_data.decode('utf-8'))
                filepath = payload.get('file')
                html_content = payload.get('html')
                
                # Security check: ensure path is within workspace and is HTML
                filepath = os.path.basename(filepath)
                if not filepath.endswith('.html'):
                    raise ValueError("Invalid file extension")
                
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(html_content)
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "success", "message": f"Saved {filepath}"}).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode('utf-8'))

        elif self.path == '/api/save-json':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                payload = json.loads(post_data.decode('utf-8'))
                filepath = payload.get('file')
                data_content = payload.get('data')
                
                # Security check: ensure path is within workspace
                filepath = os.path.normpath(filepath).replace('\\', '/')
                if not (filepath.startswith('js/') and filepath.endswith('.json')):
                    raise ValueError("Invalid file path")
                
                # Make sure parent dir exists
                os.makedirs(os.path.dirname(filepath), exist_ok=True)
                
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(json.dumps(data_content, indent=2, ensure_ascii=False))
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "success", "message": f"Saved {filepath}"}).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode('utf-8'))

        elif self.path == '/api/upload-image':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                payload = json.loads(post_data.decode('utf-8'))
                filename = payload.get('filename')
                base64_data = payload.get('base64')
                
                if ',' in base64_data:
                    base64_data = base64_data.split(',')[1]
                
                image_bytes = base64.b64decode(base64_data)
                
                # Create images dir if not exists
                os.makedirs('images', exist_ok=True)
                
                # Create a unique filename
                ext = os.path.splitext(filename)[1]
                if not ext:
                    ext = '.jpg'
                
                # Sanitise filename
                safe_name = "".join([c for c in os.path.splitext(filename)[0] if c.isalnum() or c in (' ', '_', '-')]).rstrip()
                safe_name = safe_name.replace(' ', '_')
                unique_filename = f"images/{safe_name}_{int(time.time())}{ext}"
                
                with open(unique_filename, 'wb') as f:
                    f.write(image_bytes)
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "success", "image_url": unique_filename}).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode('utf-8'))

        elif self.path == '/api/git-publish':
            try:
                # Stage files
                subprocess.run('git add .', shell=True, check=True)
                # Commit changes
                subprocess.run('git commit -m "Cap nhat website tu trinh quan tri truc quan"', shell=True, check=True)
                # Push changes
                result = subprocess.run('git push origin main', shell=True, capture_output=True, text=True)
                if result.returncode != 0:
                    raise Exception(result.stderr or result.stdout)
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "success", "message": "Website đã được xuất bản thành công lên GitHub!"}).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

# Allow address reuse
socketserver.TCPServer.allow_reuse_address = True

with socketserver.TCPServer(("", PORT), CustomHTTPRequestHandler) as httpd:
    print(f"Server is running on http://localhost:{PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
        httpd.shutdown()
