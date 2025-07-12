'use client'

import { useRef, useEffect } from 'react';

export default function StarfieldBackground() {
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const animationRef = useRef<number>(0)
	
	useEffect(() => {
		const canvas = canvasRef.current
		if (!canvas) return
		
		const ctx = canvas.getContext("2d")
		if (!ctx) return
		
		let width = window.innerWidth
		let height = window.innerHeight
		let dpr = window.devicePixelRatio || 1
		
		const starCount = 250
		let stars: Array<{
			x: number
			y: number
			size: number
			speedX: number
			speedY: number
			alpha: number
			alphaChange: number
		}> = []
		
		const initStars = () => {
			stars = []
			for (let i = 0; i < starCount; i++) {
				const size = Math.random() * 1.2 + 0.3
				const speedFactor = 0.05
				stars.push({
					x: Math.random() * width,
					y: Math.random() * height,
					size,
					speedX: (Math.random() - 0.5) * speedFactor,
					speedY: (Math.random() - 0.5) * speedFactor,
					alpha: Math.random() * 0.5 + 0.3,
					alphaChange: (Math.random() - 0.5) * 0.003,
				})
			}
		}
		
		const resizeCanvas = () => {
			width = window.innerWidth
			height = window.innerHeight
			dpr = window.devicePixelRatio || 1
			
			canvas.width = width * dpr
			canvas.height = height * dpr
			canvas.style.width = `${width}px`
			canvas.style.height = `${height}px`
			
			ctx.setTransform(1, 0, 0, 1, 0, 0) // reset transform
			ctx.scale(dpr, dpr)
			
			// Reinitialize stars for new size
			initStars()
		}
		
		resizeCanvas()
		window.addEventListener("resize", resizeCanvas)
		
		const animate = () => {
			// Clear full logical canvas
			ctx.clearRect(0, 0, width, height)
			
			// Black background
			ctx.fillStyle = "black"
			ctx.fillRect(0, 0, width, height)
			
			stars.forEach((star) => {
				star.x += star.speedX
				star.y += star.speedY
				
				// Wrap around
				if (star.x < 0) star.x = width
				if (star.x > width) star.x = 0
				if (star.y < 0) star.y = height
				if (star.y > height) star.y = 0
				
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
