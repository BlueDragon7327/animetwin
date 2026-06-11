import requests
import re
from flask import Flask, jsonify, render_template, request
from urllib.parse import quote

app = Flask(__name__)
API_BASE = "https://anipub.xyz"

def fix_img(url):
    if not url:
        return ""
    if url.startswith("https://"):
        return url
    if url.startswith("http://"):
        return url
    if url.startswith("src="):
        url = url.replace("src=", "", 1)
        if url.startswith("https://") or url.startswith("http://"):
            return url
    return f"{API_BASE}/{url.lstrip('/')}"

def fix_ep_link(link):
    raw = link.replace("src=", "", 1) if link.startswith("src=") else link
    return raw

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/details/<id>")
def details(id):
    return render_template("details.html", anime_id=id)

@app.route("/watch/<id>")
def watch(id):
    ep = request.args.get("ep", 1)
    return render_template("watch.html", anime_id=id, ep=ep)

@app.route("/genre")
def genre_page():
    g = request.args.get("g", "")
    sort = request.args.get("sort", "")
    return render_template("genre.html", g=g, sort=sort)

@app.route("/search")
def search_page():
    q = request.args.get("q", "")
    return render_template("search.html", q=q)

@app.route("/api/proxy/info/<id>")
def proxy_info(id):
    try:
        resp = requests.get(f"{API_BASE}/api/info/{id}", timeout=15)
        data = resp.json()
        data["ImagePath"] = fix_img(data.get("ImagePath"))
        data["Cover"] = fix_img(data.get("Cover"))
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/proxy/full/<id>")
def proxy_full(id):
    try:
        resp = requests.get(f"{API_BASE}/anime/api/details/{id}", timeout=15)
        data = resp.json()
        if "local" in data:
            data["local"]["ImagePath"] = fix_img(data["local"].get("ImagePath"))
            data["local"]["Cover"] = fix_img(data["local"].get("Cover"))
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/proxy/stream/<id>")
def proxy_stream(id):
    try:
        resp = requests.get(f"{API_BASE}/v1/api/details/{id}", timeout=15)
        data = resp.json()
        if "local" in data:
            data["local"]["link"] = fix_ep_link(data["local"].get("link", ""))
            for ep in data["local"].get("ep", []):
                if "link" in ep:
                    ep["link"] = fix_ep_link(ep["link"])
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/proxy/search")
def proxy_search():
    q = request.args.get("q", "")
    if not q:
        return jsonify([])
    try:
        resp = requests.get(f"{API_BASE}/api/search/{quote(q)}", timeout=15)
        data = resp.json()
        for item in data:
            if "Image" in item:
                item["Image"] = fix_img(item["Image"])
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/proxy/searchall")
def proxy_searchall():
    q = request.args.get("q", "")
    page = request.args.get("page", 1)
    if not q:
        return jsonify({"AniData": [], "currentPage": 1})
    try:
        resp = requests.get(f"{API_BASE}/api/searchall/{quote(q)}?page={page}", timeout=15)
        data = resp.json()
        for item in data.get("AniData", []):
            item["ImagePath"] = fix_img(item.get("ImagePath"))
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/proxy/genre/<genre>")
def proxy_genre(genre):
    page = request.args.get("page", 1)
    try:
        resp = requests.get(f"{API_BASE}/api/findbyGenre/{quote(genre)}?Page={page}", timeout=15)
        data = resp.json()
        for item in data.get("wholePage", []):
            item["ImagePath"] = fix_img(item.get("ImagePath"))
            item["Cover"] = fix_img(item.get("Cover"))
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/proxy/top")
def proxy_top():
    page = request.args.get("page", 1)
    try:
        resp = requests.get(f"{API_BASE}/api/findbyrating?page={page}", timeout=15)
        data = resp.json()
        for item in data.get("AniData", []):
            item["ImagePath"] = fix_img(item.get("ImagePath"))
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/proxy/sort")
def proxy_sort():
    params = {}
    for key in ["name", "genre", "ratefrom", "rateto", "page"]:
        val = request.args.get(key)
        if val:
            params[key] = val
    try:
        resp = requests.get(f"{API_BASE}/api/sort", params=params, timeout=15)
        data = resp.json()
        if len(data) > 1:
            for item in data[1]:
                item["ImagePath"] = fix_img(item.get("ImagePath"))
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/proxy/getAll")
def proxy_getAll():
    try:
        resp = requests.get(f"{API_BASE}/api/getAll", timeout=15)
        return jsonify(resp.json())
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/proxy/find/<name>")
def proxy_find(name):
    try:
        resp = requests.get(f"{API_BASE}/api/find/{quote(name)}", timeout=15)
        return jsonify(resp.json())
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/proxy/getlast")
def proxy_getlast():
    try:
        resp = requests.get(f"{API_BASE}/api/getlast", timeout=15)
        return jsonify(resp.json())
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.errorhandler(404)
def not_found(e):
    return render_template("404.html"), 404

if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "0") == "1"
    app.run(host="0.0.0.0", port=port, debug=debug)
