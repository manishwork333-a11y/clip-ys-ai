
/* CLIP YS AI - UPLOAD AND GENERATE */

document.addEventListener("DOMContentLoaded", function () {

    const API = "https://clip-ys-ai.onrender.com";

    const uploadInput = document.getElementById("videoFile");
    const preview = document.getElementById("preview");
    const message = document.getElementById("message");
    const generateButton = document.getElementById("generate");

    let selectedFile = null;
    let videoURL = null;
    let busy = false;

    if (!uploadInput || !preview || !message || !generateButton) {
        alert("Website elements missing!");
        return;
    }

    uploadInput.addEventListener("change", function () {

        selectedFile = uploadInput.files[0];

        if (!selectedFile) return;

        if (!selectedFile.type.startsWith("video/")) {
            message.textContent = "Please select a valid video.";
            return;
        }

        if (videoURL) URL.revokeObjectURL(videoURL);

        videoURL = URL.createObjectURL(selectedFile);
        preview.src = videoURL;
        preview.hidden = false;
        preview.load();

        message.textContent =
            "Video selected. Press Generate Clips.";

    });

    async function uploadVideo(file) {

        message.textContent = "Checking server connection...";

        const ping = await fetch(API + "/", {
            method: "GET",
            cache: "no-store"
        });

        if (!ping.ok) {
            throw new Error("Server connection failed.");
        }

        message.textContent = "Uploading video. Please wait...";

        const formData = new FormData();
        formData.append("video", file);

        const controller = new AbortController();

        const timeout = setTimeout(() => {
            controller.abort();
        }, 600000);

        try {

            const response = await fetch(API + "/upload", {
                method: "POST",
                body: formData,
                signal: controller.signal
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Upload failed.");
            }

            if (!result.filename) {
                throw new Error("Server filename missing.");
            }

            return result.filename;

        } finally {
            clearTimeout(timeout);
        }
    }

    generateButton.addEventListener("click", async function () {

        if (busy) return;

        if (!selectedFile) {
            message.textContent = "Please select a video first.";
            return;
        }

        busy = true;
        generateButton.disabled = true;

        try {

            const filename = await uploadVideo(selectedFile);

            message.textContent = "Video uploaded! Generating clips...";

            const response = await fetch(API + "/generate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    filename: filename
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Generation failed.");
            }

            message.textContent =
                "Generated " + result.clips.length +
                " clips: " + result.clips.join(", ");

        } catch (error) {

            if (error.name === "AbortError") {
                message.textContent = "Upload timed out. Try again.";
            } else {
                message.textContent = "Error: " + error.message;
            }

        } finally {

            busy = false;
            generateButton.disabled = false;

        }

    });

    window.addEventListener("beforeunload", function () {
        if (videoURL) URL.revokeObjectURL(videoURL);
    });

});
                    
