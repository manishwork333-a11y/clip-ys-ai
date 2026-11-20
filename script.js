
/* CLIP YS AI - UPDATED UPLOAD AND GENERATE SYSTEM */

document.addEventListener("DOMContentLoaded", function () {

    const uploadInput = document.getElementById("videoFile");
    const preview = document.getElementById("preview");
    const message = document.getElementById("message");
    const generateButton = document.getElementById("generate");

    const API = "https://clip-ys-ai.onrender.com";

    let uploadedFilename = null;
    let uploadedFile = null;
    let currentVideoURL = null;
    let isProcessing = false;

    if (!uploadInput || !preview || !message || !generateButton) {
        alert("Required HTML elements are missing!");
        return;
    }

    // VIDEO SELECTION AND PREVIEW

    uploadInput.addEventListener("change", function () {

        const file = uploadInput.files[0];

        uploadedFilename = null;
        uploadedFile = null;

        if (!file) return;

        if (!file.type.startsWith("video/")) {
            message.textContent = "Please select a valid video.";
            return;
        }

        if (currentVideoURL) {
            URL.revokeObjectURL(currentVideoURL);
        }

        currentVideoURL = URL.createObjectURL(file);

        preview.src = currentVideoURL;
        preview.hidden = false;
        preview.load();

        message.textContent =
            "Video selected! Press Generate Clips to continue.";

    });

    // UPLOAD VIDEO

    async function uploadVideo(file) {

        message.textContent = "Connecting to server...";

        const formData = new FormData();
        formData.append("video", file);

        const controller = new AbortController();

        const timeout = setTimeout(function () {
            controller.abort();
        }, 180000);

        try {

            message.textContent = "Uploading video... Please wait.";

            const response = await fetch(API + "/upload", {
                method: "POST",
                body: formData,
                signal: controller.signal
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Upload failed");
            }

            if (!result.filename) {
                throw new Error("Server did not return a filename.");
            }

            uploadedFilename = result.filename;
            uploadedFile = file;

            message.textContent = "Video uploaded successfully!";

            return uploadedFilename;

        } catch (error) {

            if (error.name === "AbortError") {
                throw new Error("Upload timed out. Please try again.");
            }

            throw error;

        } finally {
            clearTimeout(timeout);
        }
    }

    // GENERATE CLIPS

    generateButton.addEventListener("click", async function () {

        const file = uploadInput.files[0];

        if (!file) {
            message.textContent = "Please select a video first!";
            return;
        }

        if (isProcessing) return;

        isProcessing = true;
        generateButton.disabled = true;

        try {

            // Upload only if needed

            if (!uploadedFilename || uploadedFile !== file) {
                await uploadVideo(file);
            }

            message.textContent = "Generating clips... Please wait.";

            const controller = new AbortController();

            const timeout = setTimeout(function () {
                controller.abort();
            }, 600000);

            try {

                const response = await fetch(API + "/generate", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        filename: uploadedFilename
                    }),
                    signal: controller.signal
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || "Generation failed");
                }

                message.textContent =
                    "Success! " + result.clips.length +
                    " clips generated: " + result.clips.join(", ");

            } finally {
                clearTimeout(timeout);
            }

        } catch (error) {

            if (error.name === "AbortError") {
                message.textContent =
                    "Request timed out. Please try again.";
            } else {
                message.textContent = "Error: " + error.message;
            }

        } finally {

            isProcessing = false;
            generateButton.disabled = false;

        }

    });

    // CLEANUP

    window.addEventListener("beforeunload", function () {

        if (currentVideoURL) {
            URL.revokeObjectURL(currentVideoURL);
        }

    });

});
