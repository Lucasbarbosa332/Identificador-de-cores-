import React, { StrictMode, useEffect, useRef, useState } from "https://esm.sh/react";
import { createRoot } from "https://esm.sh/react-dom/client";
import chroma from "https://esm.sh/chroma-js?bundle-deps";
createRoot(document.getElementById("root")).render(React.createElement(StrictMode, null,
    React.createElement("main", null,
        React.createElement(ImageToColorPalette, null))));
function ColorOutput({ palettes }) {
    const [colorLimit, setColorLimit] = useState(8);
    const colorLimitMin = 1;
    const colorLimitMax = 32;
    return (React.createElement("div", { className: "cpe__output" },
        React.createElement(Knobs, null,
            React.createElement(InputNumber, { id: "color-limit", label: "Color Limit", min: colorLimitMin, max: colorLimitMax, value: colorLimit, changeEvent: setColorLimit })),
        palettes.length ?
            React.createElement(ColorPalette, { colors: palettes[colorLimit - 1], limit: colorLimit })
            :
                React.createElement(ColorPalettePlaceholder, null)));
}
function ColorPalette({ colors, limit = 8 }) {
    const colorSpaces = ["hex", "hsl", "rgb", "lab"];
    const limitedColors = colors.slice(0, limit);
    return (React.createElement("div", { className: "cpe__palette" }, limitedColors.map((color, i) => (React.createElement("div", { "data-color": i + 1, key: i },
        React.createElement("div", { className: "cpe__palette-color", style: { backgroundColor: color.hex } }),
        colorSpaces.map((name, i) => (React.createElement(ColorPaletteValue, { value: color[name], key: i }))))))));
}
function ColorPalettePlaceholder() {
    return (React.createElement("p", { className: "cpe__placeholder" },
        React.createElement("em", null, "(Upload an image first.)")));
}
function ColorPaletteValue({ value }) {
    const [copied, setCopied] = useState(false);
    const frameId = useRef(0);
    /**
     * Copy a color value to the clipboard (secure connection required).
     * @param text text to copy
     */
    async function copyValue(text) {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
        }
        catch (_a) {
            alert("Connection isn’t secure for copying to the clipboard!");
        }
    }
    useEffect(() => {
        const resetCopied = () => {
            setCopied(false);
        };
        clearTimeout(frameId.current);
        frameId.current = setTimeout(resetCopied, 1e3);
        return () => clearTimeout(frameId.current);
    }, [copied]);
    return (React.createElement("button", { className: `cpe__palette-value${copied ? " cpe__palette-value--success" : ""}`, type: "button", onClick: () => copyValue(value) }, copied ? "Copied!" : value));
}
function ImageArea({ colorSetter }) {
    const canvasRef = useRef(null);
    const [image, setImage] = useState(null);
    /** Resize the canvas based on the uploaded image’s dimensions. */
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas === null || canvas === void 0 ? void 0 : canvas.getContext("2d", { willReadFrequently: true });
        const addUniqueColor = (colors, color, hashSet, bucketSize = 5) => {
            // use hash buckets to group similar colors, which help reduce comparisons needed
            const [_r, _g, _b] = color;
            const r = Math.floor(_r / bucketSize);
            const g = Math.floor(_g / bucketSize);
            const b = Math.floor(_b / bucketSize);
            const newColorHash = `${r},${g},${b}`;
            if (hashSet.has(newColorHash))
                return;
            hashSet.add(newColorHash);
            colors.push(color);
        };
        const updateCanvas = (canvas, ctx, image) => {
            // restrict image size for performance
            const sideLimit = 960;
            let { width, height } = image;
            // keep it proportional
            if (width >= height) {
                width = Math.min(width, sideLimit);
                height = width * (image.height / image.width);
            }
            else {
                height = Math.min(height, sideLimit);
                width = height * (image.width / image.height);
            }
            // update the canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(image, 0, 0, width, height);
        };
        const updateColors = (canvas, ctx) => {
            // analyze the pixels
            const { width, height } = canvas;
            const longestSide = Math.max(width, height);
            const imageData = ctx.getImageData(0, 0, width, height);
            const { data } = imageData;
            const colors = [];
            const hashSet = new Set();
            // hash bucket size should depend on the image size
            const bucketSize = Math.max(5, Math.round(longestSide ** 2 / 15000));
            for (let i = 0; i < data.length; i += 4) {
                // skip transparent pixels
                if (data[i + 3] === 0)
                    continue;
                const color = new Uint8ClampedArray(3);
                color[0] = data[i];
                color[1] = data[i + 1];
                color[2] = data[i + 2];
                addUniqueColor(colors, color, hashSet, bucketSize);
            }
            const colorLimitHard = 32;
            let c = colorLimitHard;
            const possiblePalettes = [];
            while (c--) {
                const colorsTop = colors.slice(0, colorLimitHard - c);
                const colorsConverted = colorsTop.map(color => {
                    const [r, g, b] = color;
                    return {
                        hex: Utils.RGBToHex(r, g, b),
                        hsl: Utils.RGBToHSL(r, g, b, true),
                        rgb: Utils.RGBToString(r, g, b),
                        lab: Utils.RGBToLab(r, g, b, true)
                    };
                }).sort((a, b) => {
                    if (a.hex < b.hex)
                        return -1;
                    if (a.hex > b.hex)
                        return 1;
                    return 0;
                });
                possiblePalettes.push(colorsConverted);
            }
            colorSetter === null || colorSetter === void 0 ? void 0 : colorSetter(possiblePalettes);
        };
        if (canvas && ctx && image) {
            Promise.resolve()
                .then(() => updateCanvas(canvas, ctx, image))
                .then(() => updateColors(canvas, ctx));
        }
    }, [image, colorSetter]);
    return (React.createElement("div", { className: "cpe__image" },
        React.createElement("canvas", { className: "cpe__image-canvas", ref: canvasRef }),
        React.createElement(ImageUpload, { hasUpload: image !== null, imageSetter: setImage })));
}
function ImagePreloader() {
    return (React.createElement("div", { className: "cpe__image-preloader" },
        React.createElement("div", { className: "cpe__image-preloader-dot" }),
        React.createElement("div", { className: "cpe__image-preloader-dot" }),
        React.createElement("div", { className: "cpe__image-preloader-dot" })));
}
function ImageToColorPalette() {
    const [colors, setColors] = useState([]);
    return (React.createElement("div", { className: "cpe" },
        React.createElement(ImageArea, { colorSetter: setColors }),
        React.createElement(ColorOutput, { palettes: colors })));
}
function ImageUpload({ hasUpload, imageSetter }) {
    const [draggingOver, setDraggingOver] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState("");
    const sizeLimitInMB = 10;
    const errorClass = error ? " cpe__image-upload--error" : "";
    const hasUploadClass = hasUpload ? " cpe__image-upload--uploaded" : "";
    const draggingOverClass = draggingOver ? " cpe__image-upload--over" : "";
    const processingClass = processing ? " cpe__image-upload--processing" : "";
    /**
     * Trigger the `dragOver` effect when draggingn over the image area.
     * @param e Drag event
     */
    function dragOverEffect(e) {
        e.preventDefault();
        setDraggingOver(true);
    }
    /**
     * Run the change handler when selecting a file to upload.
     * @param e Input change event
     */
    function fileChange(e) {
        const files = e.target.files;
        processImagePromise(files);
    }
    /**
     * Run the change handler when dragging and dropping a file.
     * @param e Drag event
     */
    function fileDrop(e) {
        e.preventDefault();
        setDraggingOver(false);
        const files = e.dataTransfer.files;
        processImagePromise(files);
    }
    /**
     * Process and vet the selected image for display on the canvas.
     * @param files List of files
     */
    async function processImage(files) {
        return await new Promise((resolve, reject) => {
            if (!files.length)
                return;
            setProcessing(true);
            // if multiple files, use only the first
            const [file] = files;
            const { size, type } = file;
            if (!type.match("image.*")) {
                reject("File must be an image.");
                return;
            }
            if (size >= 2 ** 20 * sizeLimitInMB) {
                reject(`Image must be under ${sizeLimitInMB}MB.`);
                return;
            }
            const reader = new FileReader();
            reader.onload = e2 => {
                var _a;
                const tempImg = new Image();
                tempImg.src = (_a = e2.target) === null || _a === void 0 ? void 0 : _a.result;
                tempImg.onload = () => {
                    imageSetter(tempImg);
                    setError("");
                    resolve();
                };
                tempImg.onerror = () => {
                    reject("Image may be corrupted. Try another one.");
                };
            };
            reader.readAsDataURL(file);
        });
    }
    /**
     * Run a promise for processing the image so that the preloader is stopped upon finish.
     * @param files List of files
     */
    function processImagePromise(files) {
        processImage(files)
            .then(() => setProcessing(false))
            .catch(err => {
            setProcessing(false);
            setError(err);
        });
    }
    return (React.createElement("div", { className: `cpe__image-upload${errorClass}${hasUploadClass}${draggingOverClass}${processingClass}`, onDragLeave: () => setDraggingOver(false), onDragOver: dragOverEffect, onDrop: fileDrop },
        React.createElement("input", { className: "cpe__image-file", id: "img-upload", type: "file", accept: "image/*", onChange: fileChange }),
        React.createElement("label", { className: "cpe__image-label", htmlFor: "img-upload" },
            React.createElement("span", { className: "cpe__image-text" },
                React.createElement("svg", { className: "cpe__icon", viewBox: "3 3 18 18", width: "60px", height: "60px", "aria-hidden": "true" },
                    React.createElement("path", { d: "M6.205 3h11.59c1.114 0 1.519.116 1.926.334.407.218.727.538.945.945.218.407.334.811.334 1.926v7.51l-4.391-4.053a1.5 1.5 0 0 0-2.265.27l-3.13 4.695-2.303-1.48a1.5 1.5 0 0 0-1.96.298L3.005 18.15A12.98 12.98 0 0 1 3 17.795V6.205c0-1.115.116-1.519.334-1.926.218-.407.538-.727.945-.945C4.686 3.116 5.09 3 6.205 3zm9.477 8.53L21 16.437v1.357c0 1.114-.116 1.519-.334 1.926a2.272 2.272 0 0 1-.945.945c-.407.218-.811.334-1.926.334H6.205c-1.115 0-1.519-.116-1.926-.334a2.305 2.305 0 0 1-.485-.345L8.2 15.067l2.346 1.508a1.5 1.5 0 0 0 2.059-.43l3.077-4.616zM7.988 6C6.878 6 6 6.832 6 7.988 6 9.145 6.879 10 7.988 10 9.121 10 10 9.145 10 7.988 10 6.832 9.121 6 7.988 6z", fill: "currentcolor" })),
                React.createElement("strong", null, "Drag and drop an image here"),
                React.createElement("br", null),
                React.createElement("small", null, "(or browse to upload)"),
                React.createElement("br", null),
                React.createElement("small", null,
                    "Limit ",
                    sizeLimitInMB,
                    "MB"),
                React.createElement("br", null))),
        React.createElement("div", { className: "cpe__image-error" }, error),
        processing && React.createElement(ImagePreloader, null)));
}
function InputNumber({ id, label, min, max, value, changeEvent }) {
    /**
     * Keep the changed value within the allowed range.
     * @param e Input change event
     */
    function handleChange(e) {
        const value = +e.target.value;
        if (value < min) {
            changeEvent(min);
            return;
        }
        if (value > max) {
            changeEvent(max);
            return;
        }
        changeEvent(value);
    }
    return (React.createElement("div", { className: "cpe__input" },
        React.createElement("label", { htmlFor: "color-limit", className: "cpe__input-label" },
            label,
            " ",
            React.createElement("span", { className: "cpe__input-hint" },
                "(",
                min,
                "\u2013",
                max,
                ")")),
        React.createElement("input", { id: id, className: "cpe__input-control", type: "number", min: min, max: max, value: value, onChange: handleChange })));
}
function Knobs({ children }) {
    return (React.createElement("div", { className: "cpe__knobs" }, children));
}
;
class Utils {
    /**
     * Convert an RGB color to hex.
     * @param R red (0–255)
     * @param G green (0–255)
     * @param B blue (0–255)
     */
    static RGBToHex(R, G, B) {
        return chroma(R, G, B).hex();
    }
    ;
    /**
     * Convert an RGB color to HSL.
     * @param R red (0–255)
     * @param G green (0–255)
     * @param B blue (0–255)
     * @param isString return as a string
     */
    static RGBToHSL(R, G, B, isString) {
        let [h, s, l] = chroma(R, G, B).hsl();
        h = +h.toFixed(2) || 0;
        s = +(s * 100).toFixed(2);
        l = +(l * 100).toFixed(2);
        return isString ? `hsl(${h}, ${s}%, ${l}%)` : [h, s, l];
    }
    /**
     * Output an RGB string.
     * @param R red (0–255)
     * @param G green (0–255)
     * @param B blue (0–255)
     */
    static RGBToString(R, G, B) {
        return `rgb(${R}, ${G}, ${B})`;
    }
    /**
     * Convert an RGB color to Lab.
     * @param R red (0–255)
     * @param G green (0–255)
     * @param B blue (0–255)
     * @param isString return as a string
     */
    static RGBToLab(R, G, B, isString) {
        let [l, a, b] = chroma(R, G, B).lab();
        l = +l.toFixed(2);
        a = +a.toFixed(2);
        b = +b.toFixed(2);
        return isString ? `lab(${l}% ${a} ${b})` : [l, a, b];
    }
}