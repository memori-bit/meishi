/**
 * テストアカウント作成スクリプト（FREE、PRO、EXPO）
 * 
 * 使用方法:
 *   npm run create-test-accounts
 */

import { PrismaClient, Plan } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

interface TestAccount {
  email: string
  password: string
  plan: Plan
}

const testAccounts: TestAccount[] = [
  {
    email: 'free@example.com',
    password: 'free123',
    plan: 'FREE',
  },
  {
    email: 'pro@example.com',
    password: 'pro123',
    plan: 'PRO',
  },
  {
    email: 'expo@example.com',
    password: 'expo123',
    plan: 'EXPO',
  },
]

async function createTestAccounts() {
  // データベース接続確認
  if (!process.env.DATABASE_URL) {
    console.error('❌ エラー: DATABASE_URL が設定されていません')
    console.log('')
    console.log('.env ファイルに以下を追加してください:')
    console.log('  DATABASE_URL="postgresql://user:password@localhost:5432/meishi?schema=public"')
    console.log('')
    console.log('='.repeat(60))
    console.log('📋 作成予定のアカウント情報（データベース接続なし）')
    console.log('='.repeat(60))
    console.log('')
    for (const account of testAccounts) {
      console.log(`【${account.plan} プラン】`)
      console.log(`  メールアドレス: ${account.email}`)
      console.log(`  パスワード: ${account.password}`)
      console.log('')
    }
    process.exit(1)
  }

  try {
    // データベース接続テスト
    await prisma.$connect()
    console.log('✅ データベースに接続しました')
    console.log('')

    const results: Array<{ email: string; password: string; plan: Plan; created: boolean }> = []

    for (const account of testAccounts) {
      try {
        // 既存のアカウントをチェック
        const existingUser = await prisma.user.findUnique({
          where: { email: account.email },
          include: { userPlan: true },
        })

        if (existingUser) {
          // 既存のアカウントがある場合、パスワードとプランを更新
          const hashedPassword = await bcrypt.hash(account.password, 10)
          await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              password: hashedPassword,
              userPlan: {
                upsert: {
                  create: {
                    plan: account.plan,
                  },
                  update: {
                    plan: account.plan,
                  },
                },
              },
            },
          })
          console.log(`✅ ${account.plan} アカウントを更新しました: ${account.email}`)
          results.push({ ...account, created: false })
        } else {
          // 新しいアカウントを作成
          const hashedPassword = await bcrypt.hash(account.password, 10)
          const user = await prisma.user.create({
            data: {
              email: account.email,
              password: hashedPassword,
              userPlan: {
                create: {
                  plan: account.plan,
                },
              },
            },
          })
          console.log(`✅ ${account.plan} アカウントを作成しました: ${account.email}`)
          results.push({ ...account, created: true })
        }
      } catch (error: any) {
        console.error(`❌ ${account.plan} アカウントの作成に失敗しました: ${account.email}`)
        console.error(`   エラー: ${error.message}`)
      }
    }

    console.log('')
    console.log('='.repeat(60))
    console.log('📋 作成されたアカウント情報')
    console.log('='.repeat(60))
    console.log('')

    for (const result of results) {
      console.log(`【${result.plan} プラン】`)
      console.log(`  メールアドレス: ${result.email}`)
      console.log(`  パスワード: ${result.password}`)
      console.log(`  プラン: ${result.plan}`)
      console.log(`  ステータス: ${result.created ? '新規作成' : '更新'}`)
      console.log('')
    }

    console.log('='.repeat(60))
    console.log('')
    console.log('✅ すべてのテストアカウントの作成が完了しました')
    console.log('')

  } catch (error: any) {
    console.error('❌ エラー:', error.message || error)
    if (error.code === 'P1001') {
      console.error('')
      console.error('データベースに接続できません。以下を確認してください:')
      console.error('  1. DATABASE_URLが正しく設定されているか')
      console.error('  2. データベースサーバーが起動しているか')
      console.error('  3. ネットワーク接続が正常か')
    }
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

createTestAccounts()
