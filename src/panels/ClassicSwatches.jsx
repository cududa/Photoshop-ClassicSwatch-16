import React, { useEffect, useRef, useState } from "react";

const COLUMN_COUNT = 16;
const SWATCH_GAP = 1;
const GRID_INSET_WIDTH = 2;

const SWATCHES = [
    "#FF0000", "#FFFF00", "#00FF00", "#00FFFF", "#0000FF", "#FF00FF", "#FFFFFF", "#E6E6E6",
    "#DADAD9", "#CDCDCD", "#C0C0C0", "#B4B4B4", "#A7A7A7", "#9A9A9A", "#8D8D8D", "#818181",
    "#EE1D24", "#FFF100", "#00A650", "#00AEEF", "#2F3192", "#ED008C", "#747474", "#666666",
    "#595959", "#4B4B4B", "#3E3E3E", "#332F2E", "#212121", "#131313", "#000000", "#000000",
    "#F7977A", "#FBAD82", "#FDC68C", "#FFF799", "#C6DF9C", "#A4D49D", "#81CA9D", "#7BCCC9",
    "#6DCFF7", "#7CA6D8", "#8293CA", "#8881BE", "#A286BD", "#BC8CBF", "#F49BC1", "#F5999D",
    "#F06C4D", "#F68E54", "#FBAF5A", "#FFF467", "#ACD372", "#7DC473", "#39B778", "#16BCB4",
    "#00BFF3", "#448CCB", "#5373B8", "#5E5CA7", "#855FA8", "#A763A9", "#EF6EA8", "#F16D7E",
    "#EE1D24", "#F16522", "#F7941D", "#FFF100", "#8FC63D", "#37B44A", "#00A650", "#00A99E",
    "#00AEEF", "#0072BD", "#0054A5", "#2F3192", "#652C91", "#91278F", "#ED008C", "#EE105A",
    "#9D0A0F", "#A1410D", "#A36209", "#ABA000", "#588528", "#197B30", "#007236", "#00736A",
    "#0076A4", "#004A80", "#003469", "#160E67", "#460968", "#62055F", "#9D005C", "#9D0039",
    "#780000", "#7B3000", "#7C4900", "#847A00", "#3E6617", "#025C22", "#025C22", "#005951",
    "#005B7E", "#003469", "#002056", "#09004A", "#30004A", "#4B0048", "#790045", "#7A0026",
    "#C7B198", "#9A8575", "#726357", "#534841", "#332F2E", "#C79C6D", "#A77C50", "#8C623A",
    "#744B24", "#613813"
];

function normalizeHex(value) {
    const raw = String(value || "").trim().replace(/^#/, "");

    if (/^[0-9a-fA-F]{3}$/.test(raw)) {
        return "#" + raw.split("").map(ch => ch + ch).join("").toUpperCase();
    }

    if (/^[0-9a-fA-F]{6}$/.test(raw)) {
        return "#" + raw.toUpperCase();
    }

    return null;
}

function hexToRgb(hex) {
    const clean = hex.replace("#", "");

    return {
        red: parseInt(clean.slice(0, 2), 16),
        green: parseInt(clean.slice(2, 4), 16),
        blue: parseInt(clean.slice(4, 6), 16)
    };
}

function rgbToActionColor(rgb) {
    return {
        _obj: "RGBColor",
        red: rgb.red,
        grain: rgb.green,
        blue: rgb.blue
    };
}

function createSolidColor(app, rgb) {
    if (!app || !app.SolidColor) return null;

    const color = new app.SolidColor();
    color.rgb.red = rgb.red;
    color.rgb.green = rgb.green;
    color.rgb.blue = rgb.blue;

    return color;
}

function getFirstActiveLayer(app) {
    try {
        if (!app || !app.activeDocument || !app.activeDocument.activeLayers) return null;
        return app.activeDocument.activeLayers[0] || null;
    } catch (error) {
        return null;
    }
}

function getSwatchSize(containerWidth) {
    const availableWidth = Math.max(0, containerWidth - GRID_INSET_WIDTH - (SWATCH_GAP * (COLUMN_COUNT - 1)));

    return Math.max(7, Math.floor(availableWidth / COLUMN_COUNT));
}

function getRows(values) {
    const rows = [];

    for (let index = 0; index < values.length; index += COLUMN_COUNT) {
        rows.push(values.slice(index, index + COLUMN_COUNT));
    }

    return rows;
}

async function copyTextToClipboard(value) {
    if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(value);
        return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();

    try {
        if (!document.execCommand("copy")) {
            throw new Error("Copy command was unavailable");
        }
    } finally {
        document.body.removeChild(textarea);
    }
}

async function setForegroundColor(app, action, rgb) {
    const color = createSolidColor(app, rgb);

    if (color) {
        app.foregroundColor = color;
        return;
    }

    if (!action || !action.batchPlay) {
        throw new Error("Photoshop color APIs are unavailable");
    }

    await action.batchPlay([
        {
            _obj: "set",
            _target: [{ _ref: "color", _property: "foregroundColor" }],
            to: rgbToActionColor(rgb)
        }
    ], { synchronousExecution: true });
}

async function setActiveTextColor(app, action, rgb) {
    if (!action || !action.batchPlay) return false;

    try {
        await action.batchPlay([
            {
                _obj: "set",
                _target: [
                    { _ref: "property", _property: "textStyle" },
                    { _ref: "textLayer", _enum: "ordinal", _value: "targetEnum" }
                ],
                to: {
                    _obj: "textStyle",
                    color: rgbToActionColor(rgb)
                }
            }
        ], { synchronousExecution: true });
        return true;
    } catch (error) {
        const activeLayer = getFirstActiveLayer(app);
        const color = createSolidColor(app, rgb);

        if (!activeLayer || !activeLayer.textItem || !activeLayer.textItem.characterStyle || !color) {
            return false;
        }

        activeLayer.textItem.characterStyle.color = color;
        return true;
    }
}

async function setActiveShapeFillColor(action, rgb) {
    if (!action || !action.batchPlay) return false;

    try {
        await action.batchPlay([
            {
                _obj: "set",
                _target: [{ _ref: "contentLayer", _enum: "ordinal", _value: "targetEnum" }],
                to: {
                    _obj: "solidColorLayer",
                    color: rgbToActionColor(rgb)
                }
            }
        ], { synchronousExecution: true });
        return true;
    } catch (error) {
        return false;
    }
}

async function applyPhotoshopColor(hex) {
    const photoshop = require("photoshop");
    const { app, core, action } = photoshop;
    const rgb = hexToRgb(hex);

    if (!core || !core.executeAsModal) {
        throw new Error("Photoshop modal API is unavailable");
    }

    await core.executeAsModal(async () => {
        await setForegroundColor(app, action, rgb);
        await setActiveTextColor(app, action, rgb);
        await setActiveShapeFillColor(action, rgb);
    }, { commandName: "Classic Swatches: apply color" });
}

export function ClassicSwatches() {
    const gridRef = useRef(null);
    const copiedTimeoutRef = useRef(null);
    const [swatchSize, setSwatchSize] = useState(12);
    const [copiedSwatchIndex, setCopiedSwatchIndex] = useState(null);
    const rows = getRows(SWATCHES);

    useEffect(() => {
        let lastSize = 0;

        function measure() {
            if (!gridRef.current) return;

            const nextSize = getSwatchSize(gridRef.current.clientWidth || 0);

            if (nextSize !== lastSize) {
                lastSize = nextSize;
                setSwatchSize(nextSize);
            }
        }

        measure();

        const interval = setInterval(measure, 250);
        window.addEventListener("resize", measure);

        return () => {
            clearInterval(interval);
            window.removeEventListener("resize", measure);
        };
    }, []);

    useEffect(() => () => {
        if (copiedTimeoutRef.current) {
            clearTimeout(copiedTimeoutRef.current);
        }
    }, []);

    async function applySwatch(value) {
        const normalized = normalizeHex(value);

        if (!normalized) {
            console.warn(`Invalid swatch color: ${value}`);
            return;
        }

        try {
            await applyPhotoshopColor(normalized);
        } catch (error) {
            console.error(error);
        }
    }

    async function copySwatch(value, swatchIndex) {
        const normalized = normalizeHex(value);

        if (!normalized) {
            console.warn(`Invalid swatch color: ${value}`);
            return;
        }

        try {
            await copyTextToClipboard(normalized);
            setCopiedSwatchIndex(swatchIndex);

            if (copiedTimeoutRef.current) {
                clearTimeout(copiedTimeoutRef.current);
            }

            copiedTimeoutRef.current = setTimeout(() => {
                setCopiedSwatchIndex(null);
                copiedTimeoutRef.current = null;
            }, 900);
        } catch (error) {
            console.error(error);
        }
    }

    return (
        <main className="classic-swatches">
            <div className="swatch-grid" ref={gridRef} aria-label="Classic Photoshop swatches">
                {rows.map((row, rowIndex) => (
                    <div className="swatch-row" key={`row-${rowIndex}`}>
                        {row.map((hex, columnIndex) => {
                            const swatchIndex = (rowIndex * COLUMN_COUNT) + columnIndex;

                            return (
                                <div
                                    className={`swatch${copiedSwatchIndex === swatchIndex ? " copied" : ""}`}
                                    key={`${hex}-${swatchIndex}`}
                                    role="button"
                                    tabIndex={0}
                                    title={copiedSwatchIndex === swatchIndex ? `Copied ${hex}` : `${swatchIndex + 1}: ${hex}`}
                                    aria-label={`Set foreground color to ${hex}; right click copies hex value`}
                                    style={{
                                        backgroundColor: hex,
                                        width: swatchSize,
                                        height: swatchSize,
                                        marginRight: columnIndex === row.length - 1 ? 0 : SWATCH_GAP,
                                        marginBottom: rowIndex === rows.length - 1 ? 0 : SWATCH_GAP
                                    }}
                                    onClick={event => {
                                        if (event.button !== 0) return;
                                        applySwatch(hex);
                                    }}
                                    onMouseDown={event => event.preventDefault()}
                                    onContextMenu={event => {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        copySwatch(hex, swatchIndex);
                                    }}
                                    onKeyDown={event => {
                                        if (event.key === "Enter" || event.key === " ") {
                                            event.preventDefault();
                                            applySwatch(hex);
                                        }
                                    }}
                                />
                            );
                        })}
                    </div>
                ))}
            </div>
        </main>
    );
}
