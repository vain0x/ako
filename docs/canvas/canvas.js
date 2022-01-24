const TAU = Math.PI * 2

const canvasElement = document.getElementById("canvas")

const onResize = () => {
  canvasElement.width = document.body.clientWidth
  canvasElement.height = document.body.clientHeight
}

onResize()
// document.addEventListener("resize", onResize)

canvasElement.addEventListener("mousedown", ev => {
  if (!(ev.button === 0 && !ev.altKey && !ev.ctrlKey && !ev.shiftKey && !ev.metaKey)) {
    return
  }

  const onMouseMove = ev => {
    const { x, y } = ev

    window.requestAnimationFrame(() => {
      const context = canvasElement.getContext("2d")
      context.fillStyle = "#212121"
      context.beginPath()
      context.ellipse(x, y, 3, 3, 0, 0, TAU)
      context.fill()
    })
  }

  canvasElement.addEventListener("mousemove", onMouseMove)

  canvasElement.addEventListener("mouseup", () => {
    canvasElement.removeEventListener("mousemove", onMouseMove)
  }, { once: true })

  canvasElement.addEventListener("mouseleave", () => {
    canvasElement.removeEventListener("mousemove", onMouseMove)
  }, { once: true })

  onMouseMove(ev)
})
