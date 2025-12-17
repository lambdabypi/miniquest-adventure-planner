// frontend/src/pages/AboutPage.tsx

import React from 'react';

const AboutPage: React.FC = () => {
	return (
		<div style={{
			maxWidth: '900px',
			margin: '0 auto',
			padding: '40px 20px',
			minHeight: 'calc(100vh - 70px)',
			background: '#f8fafc'
		}}>
			{/* Hero Section */}
			<div style={{
				background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
				padding: '60px 40px',
				borderRadius: '20px',
				color: 'white',
				textAlign: 'center',
				marginBottom: '40px',
				boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
			}}>
				<h1 style={{ fontSize: '48px', marginBottom: '15px', fontWeight: 'bold' }}>
					🗺️ MiniQuest
				</h1>
				<p style={{ fontSize: '20px', opacity: 0.95, lineHeight: '1.6' }}>
					Discover spontaneous, personalized local adventures
					<br />
					powered by 7 AI agents working in parallel
				</p>
			</div>

			{/* What We Do */}
			<section style={{
				background: 'white',
				padding: '40px',
				borderRadius: '16px',
				marginBottom: '30px',
				boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
			}}>
				<h2 style={{
					fontSize: '28px',
					marginBottom: '20px',
					color: '#667eea',
					fontWeight: 'bold'
				}}>
					✨ What MiniQuest Does
				</h2>
				<div style={{ fontSize: '16px', lineHeight: '1.8', color: '#334155' }}>
					<p style={{ marginBottom: '20px' }}>
						MiniQuest helps you discover spontaneous, personalized local adventures in New York or Boston,
						perfect for when you have <strong>1-6 hours</strong> and want to explore something new.
					</p>
					<ul style={{
						listStyle: 'none',
						padding: 0,
						display: 'grid',
						gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
						gap: '15px'
					}}>
						{[
							'Short, spontaneous adventures (2-6 hours)',
							'Local exploration in your chosen city',
							'Curated itineraries based on interests',
							'Real-time research on 70+ venues',
							'Budget-friendly options ($30-150)',
							'Same-day or "today" planning'
						].map((item, idx) => (
							<li key={idx} style={{
								padding: '12px',
								background: '#f0fdf4',
								borderRadius: '8px',
								border: '1px solid #cfeedaff',
								display: 'flex',
								alignItems: 'start',
								gap: '10px'
							}}>
								<span>{item}</span>
							</li>
						))}
					</ul>
				</div>
			</section>

			{/* Perfect For */}
			<section style={{
				background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
				padding: '40px',
				borderRadius: '16px',
				color: 'white',
				marginBottom: '30px'
			}}>
				<h2 style={{ fontSize: '28px', marginBottom: '20px', fontWeight: 'bold' }}>
					💡 Perfect For:
				</h2>
				<div style={{
					display: 'grid',
					gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
					gap: '20px',
					fontSize: '16px'
				}}>
					{[
						{ icon: '🏙️', text: 'Weekend city exploration' },
						{ icon: '☕', text: 'Afternoon coffee & culture' },
						{ icon: '🎨', text: 'Museum-hopping days' },
						{ icon: '🍽️', text: 'Dinner + evening plans' },
						{ icon: '🚶', text: 'Walking tours' },
						{ icon: '📸', text: 'Photo expedition days' }
					].map((item, idx) => (
						<div key={idx} style={{
							background: 'rgba(255,255,255,0.15)',
							backdropFilter: 'blur(10px)',
							padding: '20px',
							borderRadius: '12px',
							textAlign: 'center',
							border: '1px solid rgba(255,255,255,0.2)'
						}}>
							<div style={{ fontSize: '32px', marginBottom: '10px' }}>{item.icon}</div>
							<div>{item.text}</div>
						</div>
					))}
				</div>
			</section>

			{/* Features */}
			<section style={{
				background: 'white',
				padding: '40px',
				borderRadius: '16px',
				marginBottom: '30px',
				boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
			}}>
				<h2 style={{
					fontSize: '28px',
					marginBottom: '20px',
					color: '#667eea',
					fontWeight: 'bold'
				}}>
					🚀 How It Works
				</h2>
				<div style={{
					display: 'grid',
					gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
					gap: '20px'
				}}>
					{[
						{ num: '1', title: 'Tell us what you want', desc: 'Type in what you\'re interested in exploring' },
						{ num: '2', title: '7 AI agents get to work', desc: 'LocationParser, VenueScout, TavilyResearch, and more' },
						{ num: '3', title: 'Live research happens', desc: 'Real-time venue discovery, hours, reviews, directions' },
						{ num: '4', title: 'Get 3 curated adventures', desc: 'Personalized itineraries with maps and routing' }
					].map((step, idx) => (
						<div key={idx} style={{
							padding: '25px',
							background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
							borderRadius: '12px',
							border: '1px solid #bae6fd'
						}}>
							<div style={{
								width: '40px',
								height: '40px',
								background: '#667eea',
								color: 'white',
								borderRadius: '50%',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								fontSize: '20px',
								fontWeight: 'bold',
								marginBottom: '15px'
							}}>
								{step.num}
							</div>
							<h3 style={{ fontSize: '18px', marginBottom: '10px', color: '#0369a1', fontWeight: '600' }}>
								{step.title}
							</h3>
							<p style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.6' }}>
								{step.desc}
							</p>
						</div>
					))}
				</div>
			</section>
		</div>
	);
};

export default AboutPage;