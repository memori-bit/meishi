/**
 * 管理者アカウント作成スクリプト
 * 
 * 使用方法:
 *   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=yourpassword npm run create-admin
 * 
 * または環境変数ファイル(.env)に以下を追加:
 *   ADMIN_EMAIL=admin@example.com
 *   ADMIN_PASSWORD=yourpassword
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function createAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com'
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'

  // データベース接続確認
  if (!process.env.DATABASE_URL) {
    console.error('❌ エラー: DATABASE_URL が設定されていません')
    console.log('')
    console.log('.env ファイルに以下を追加してください:')
    console.log('  DATABASE_URL="postgresql://user:password@localhost:5432/meishi?schema=public"')
    console.log('')
    process.exit(1)
  }

  if (!adminEmail || !adminPassword) {
    console.error('❌ エラー: ADMIN_EMAIL と ADMIN_PASSWORD を設定してください')
    console.log('')
    console.log('使用方法:')
    console.log('  ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=yourpassword npm run create-admin')
    console.log('')
    console.log('または .env ファイルに以下を追加:')
    console.log('  ADMIN_EMAIL=admin@example.com')
    console.log('  ADMIN_PASSWORD=yourpassword')
    process.exit(1)
  }

  try {
    // データベース接続テスト
    await prisma.$connect()
    console.log('✅ データベースに接続しました')
    // 既存の管理者アカウントをチェック
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail },
      include: { userPlan: true },
    })

    if (existingUser) {
      // 既存のアカウントがある場合、パスワードを更新
      const hashedPassword = await bcrypt.hash(adminPassword, 10)
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          password: hashedPassword,
          userPlan: {
            upsert: {
              create: {
                plan: 'EXPO',
              },
              update: {
                plan: 'EXPO',
              },
            },
          },
        },
      })
      console.log('✅ 既存の管理者アカウントのパスワードを更新しました')
      console.log(`   メールアドレス: ${adminEmail}`)
      console.log(`   プラン: EXPO`)
    } else {
      // 新しい管理者アカウントを作成
      const hashedPassword = await bcrypt.hash(adminPassword, 10)
      const user = await prisma.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          userPlan: {
            create: {
              plan: 'EXPO',
            },
          },
        },
      })
      console.log('✅ 管理者アカウントを作成しました')
      console.log(`   メールアドレス: ${adminEmail}`)
      console.log(`   プラン: EXPO`)
      console.log(`   ID: ${user.id}`)
    }

    console.log('')
    console.log('ログイン情報:')
    console.log(`  メールアドレス: ${adminEmail}`)
    console.log(`  パスワード: ${adminPassword}`)
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

createAdmin()
