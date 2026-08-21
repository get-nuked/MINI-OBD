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
        const value = Math.sin(column * 12.9898 + row * 78.233) * 43758.5453
        return value - Math.floor(value)
    }


    for (let y = 0; y < height; y += pixelSize) {
        for (let x = 0; x < width; x += pixelSize) {
            /*
             * 0 on the left
             * 1 on the right
             */
            let progress = x / width

            /*
             * Makes the transition smoother and keeps
             * the red around for longer before becoming black.
             */
            progress = progress * progress * (3 - 2 * progress)

            /*
             * Left colour:
             * dark muted red
             */
            const startR = 115
            const startG = 25
            const startB = 28

            /*
             * Right colour:
             * almost black
             */
            const endR = 7
            const endG = 5
            const endB = 7

            // Smoothly interpolate between the two colours
            let r = startR + (endR - startR) * progress
            let g = startG + (endG - startG) * progress
            let b = startB + (endB - startB) * progress

            /*
             * Only a SMALL difference between neighbouring pixels.
             *
             * Change 10 to a smaller number for even less variation.
             */
            const variation = (pixelNoise(x / pixelSize, y / pixelSize) - 0.5) * 10

            r += variation
            g += variation
            b += variation

            bgCtx.fillStyle = `rgb(${r}, ${g}, ${b})`
            bgCtx.fillRect(x, y, pixelSize, pixelSize)
        }
    }


    /*
     * Gentle red glow on the left.
     * This sits over the pixels and helps blend them together.
     */
    const redGlow = bgCtx.createRadialGradient( width * 0.15, height * 0.35, 0, width * 0.15, height * 0.35, width * 0.55)
    redGlow.addColorStop( 0, "rgba(180, 35, 40, 0.15)")
    redGlow.addColorStop( 1, "rgba(180, 35, 40, 0)")
    bgCtx.fillStyle = redGlow
    bgCtx.fillRect( 0, 0, width, height)

    /*
     * Gentle black fade towards the right.
     */
    const darkFade = bgCtx.createLinearGradient( 0, 0, width, 0)
    darkFade.addColorStop( 0, "rgba(0, 0, 0, 0)")
    darkFade.addColorStop( 0.5, "rgba(0, 0, 0, 0)")
    darkFade.addColorStop( 1, "rgba(0, 0, 0, 0.45)")
    bgCtx.fillStyle = darkFade
    bgCtx.fillRect( 0, 0, width, height)
}

drawPixelBackground()

window.addEventListener("resize", drawPixelBackground)