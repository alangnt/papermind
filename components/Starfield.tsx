"use client"

import { useRef, useEffect } from "react"

export default function StarfieldBackground() {
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const animationRef = useRef<number>(0)
	
	useEffect(() => {
		const canvas = canvasRef.current
		if (!canvas) return
		
		const ctx = canvas.getContext("2d")
		if (!ctx) return
		
		const resizeCanvas = () => {
			canvas.width = window.innerWidth * window.devicePixelRatio
			canvas.height = window.innerHeight * window.devicePixelRatio
			ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
		}
		
		resizeCanvas()
		window.addEventListener("resize", resizeCanvas)
		
		const starCount = 250
		const stars: Array<{
			x: number
			y: number
			size: number
			speedX: number
			speedY: number
			alpha: number
			alphaChange: number
		}> = []
		
		for (let i = 0; i < starCount; i++) {
			const size = Math.random() * 1.2 + 0.3
			const speedFactor = 0.05
			stars.push({
				x: Math.random() * window.innerWidth,
				y: Math.random() * window.innerHeight,
				size,
				speedX: (Math.random() - 0.5) * speedFactor,
				speedY: (Math.random() - 0.5) * speedFactor,
				alpha: Math.random() * 0.5 + 0.3,
				alphaChange: (Math.random() - 0.5) * 0.003,
			})
		}
		
		const animate = () => {
			ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
			ctx.fillStyle = "black"
			ctx.fillRect(0, 0, window.innerWidth, window.innerHeight)
			
			stars.forEach((star) => {
				// Update position
				star.x += star.speedX
				star.y += star.speedY
				
				// Wrap around screen
				if (star.x < 0) star.x = window.innerWidth
				if (star.x > window.innerWidth) star.x = 0
				if (star.y < 0) star.y = window.innerHeight
				if (star.y > window.innerHeight) star.y = 0
				
				// Twinkle
				star.alpha += star.alphaChange
				if (star.alpha < 0.2 || star.alpha > 1) {
					star.alphaChange *= -1
				}
				
				// Draw star
				ctx.beginPath()
				ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2)
				ctx.fillStyle = "white"
				ctx.globalAlpha = star.alpha
				ctx.fill()
			})
			
			ctx.globalAlpha = 1
			animationRef.current = requestAnimationFrame(animate)
		}
		
		animate()
		
		return () => {
			window.removeEventListener("resize", resizeCanvas)
			cancelAnimationFrame(animationRef.current)
		}
	}, [])
	
	return (
		<canvas
			ref={canvasRef}
			className="fixed inset-0 w-full h-full -z-10 pointer-events-none"
		/>
	)
}
