
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import uuid

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app.config["MAX_CONTENT_LENGTH"] = 500 * 1024 * 1024

@app.route("/")
def home():
    return jsonify({
        "name": "Clip YS AI",
        "status": "Backend is ready"
    })

@app.route("/upload", methods=["POST"])
def upload_video():

    if "video" not in request.files:
        return jsonify({"error": "No video selected"}), 400

    video = request.files["video"]

    if not video.filename:
        return jsonify({"error": "Invalid filename"}), 400

    extension = os.path.splitext(video.filename)[1].lower()

    if extension not in [".mp4", ".mov", ".mkv", ".webm"]:
        return jsonify({"error": "Unsupported video format"}), 400

    filename = str(uuid.uuid4()) + extension
    filepath = os.path.join(UPLOAD_FOLDER, filename)

    video.save(filepath)

    return jsonify({
        "message": "Video uploaded successfully",
        "filename": filename
    })

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
