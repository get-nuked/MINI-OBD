const bgCanvas = document.getElementById("pixelBackground")
const bgCtx = bgCanvas.getContext("2d")


function drawPixelBackground() {
    const width = window.innerWidth
    const height = window.innerHeight

    bgCanvas.width = width
    bgCanvas.height = height


    // Size of the visible pixel blocks
    const pixelSize = width < 700 ? 24 : 32


    /*
     * Creates a small repeatable variation for each pixel.
     * This keeps the pattern stable instead of completely
     * changing whenever the window is resized.
     */
    function pixelNoise(column, row) {
        const value =
            Math.sin(
                column * 12.9898 +
                row * 78.233
            ) * 43758.5453

        return value - Math.floor(value)
    }


    for (
        let y = 0;
        y < height;
        y += pixelSize
    ) {

        for (
            let x = 0;
            x < width;
            x += pixelSize
        ) {

            /*
             * 0 on the left
             * 1 on the right
             */
            let progress =
                x / width


            /*
             * Smooth transition from grey to black.
             */
            progress =
                progress *
                progress *
                (3 - 2 * progress)


            /*
             * Left colour:
             * dark grey / blue-grey
             *
             * RGB: 47, 60, 60
             */
            const startR = 47
            const startG = 60
            const startB = 60


            /*
             * Right colour:
             * almost pure black
             */
            const endR = 5
            const endG = 5
            const endB = 5


            /*
             * Smoothly interpolate between
             * the grey and black colours.
             */
            let r =
                startR +
                (endR - startR) *
                progress

            let g =
                startG +
                (endG - startG) *
                progress

            let b =
                startB +
                (endB - startB) *
                progress


            /*
             * Small variation between neighbouring
             * pixels to create the pixel texture.
             */
            const variation =
                (
                    pixelNoise(
                        x / pixelSize,
                        y / pixelSize
                    ) - 0.5
                ) * 10


            r += variation
            g += variation
            b += variation


            bgCtx.fillStyle =
                `rgb(${r}, ${g}, ${b})`

            bgCtx.fillRect(
                x,
                y,
                pixelSize,
                pixelSize
            )
        }
    }


    /*
     * Gentle grey glow on the left.
     *
     * This replaces the old red glow so the
     * whole background stays within the
     * grey / charcoal colour scheme.
     */
    const greyGlow =
        bgCtx.createRadialGradient(
            width * 0.15,
            height * 0.35,
            0,

            width * 0.15,
            height * 0.35,
            width * 0.55
        )


    greyGlow.addColorStop(
        0,
        "rgba(47, 60, 60, 0.18)"
    )

    greyGlow.addColorStop(
        1,
        "rgba(47, 60, 60, 0)"
    )


    bgCtx.fillStyle =
        greyGlow

    bgCtx.fillRect(
        0,
        0,
        width,
        height
    )


    /*
     * Gentle black fade towards
     * the right side.
     */
    const darkFade =
        bgCtx.createLinearGradient(
            0,
            0,
            width,
            0
        )


    darkFade.addColorStop(
        0,
        "rgba(0, 0, 0, 0)"
    )

    darkFade.addColorStop(
        0.5,
        "rgba(0, 0, 0, 0)"
    )

    darkFade.addColorStop(
        1,
        "rgba(0, 0, 0, 0.45)"
    )


    bgCtx.fillStyle =
        darkFade

    bgCtx.fillRect(
        0,
        0,
        width,
        height
    )
}


drawPixelBackground()


window.addEventListener(
    "resize",
    drawPixelBackground
)