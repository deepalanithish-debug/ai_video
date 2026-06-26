'use client'

import { useState, useEffect, useRef } from 'react'
import { PageContainer } from '@/components/layout/Page'
import { WelcomeBanner } from '@/components/dashboard/WelcomeBanner'
import { CreateHero } from '@/components/dashboard/CreateHero'
import { ContinueEditing } from '@/components/dashboard/ContinueEditing'
import { RecentGenerations } from '@/components/dashboard/RecentGenerations'
import { TrendingTemplates } from '@/components/dashboard/TrendingTemplates'
import { PromptLibrary } from '@/components/dashboard/PromptLibrary'
import { QuickActions } from '@/components/dashboard/QuickActions'
import { LearnCards } from '@/components/dashboard/LearnCards'

export default function HomePage() {
  const promptRef = useRef<HTMLTextAreaElement | null>(null)
  const [showWelcome, setShowWelcome] = useState(false)
  const [showLearn, setShowLearn] = useState(true)

  useEffect(() => {
    if (!localStorage.getItem('vydeo_onboarded')) setShowWelcome(true)
    if (localStorage.getItem('vydeo_learn_dismissed')) setShowLearn(false)
  }, [])

  const dismissWelcome = () => {
    localStorage.setItem('vydeo_onboarded', '1')
    setShowWelcome(false)
  }

  const startNow = () => {
    dismissWelcome()
    setTimeout(() => {
      promptRef.current?.focus()
      promptRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 80)
  }

  const dismissLearn = () => {
    localStorage.setItem('vydeo_learn_dismissed', '1')
    setShowLearn(false)
  }

  return (
    <PageContainer>
      {showWelcome && <WelcomeBanner onDismiss={dismissWelcome} onStart={startNow} />}
      <CreateHero promptRef={promptRef} />
      <ContinueEditing />
      <RecentGenerations />
      <TrendingTemplates />
      <PromptLibrary />
      <QuickActions />
      {showLearn && <LearnCards onDismiss={dismissLearn} />}
    </PageContainer>
  )
}
