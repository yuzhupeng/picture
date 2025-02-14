'use client'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { Progress } from '~/components/ui/progress'
import { DataProps } from '~/types'
import Link from 'next/link'
import { MessageSquareHeart, Star } from 'lucide-react'
import Counter from '~/components/animata/text/counter'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'
import { useTranslations } from 'next-intl'

export default function CardList(props: Readonly<DataProps>) {
  const t = useTranslations()

  return (
    <div className="flex flex-col space-y-2">
      <div className="w-full grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
        <Card className="h-full w-full border">
          <CardHeader>
            <CardTitle>{t('Dashboard.picData')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col p2 space-y-4">
            <span className="font-light">{t('Dashboard.picData')}</span>
            <span className="text-xl font-semibold">
                {props.data?.total && props.data?.total !== 0 ?
                  <Counter targetValue={props.data?.total}/> : 0
                }
              {t('Dashboard.zhang')}
              </span>
            <span className="font-light">{t('Dashboard.picShow')}</span>
            <span className="text-xl font-semibold">
                {props.data?.showTotal && props.data?.showTotal !== 0 ?
                  <Counter targetValue={props.data?.showTotal}/> : 0
                }
              {t('Dashboard.zhang')}
              </span>
            <Progress value={(props.data?.showTotal ?? 0) / (props.data?.total ?? 1) * 100} className="w-full h-2"/>
          </CardContent>
        </Card>
        <Card className="h-full w-full border">
          <CardHeader>
            <CardTitle>{t('Dashboard.bisData')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col p2 space-y-4">
            <span className="font-light">{t('Dashboard.albumData')}</span>
            <span className="text-xl font-semibold">
                {props.data?.tagsTotal && props.data?.tagsTotal !== 0 ?
                  <Counter targetValue={props.data?.tagsTotal}/> : 0
                }
              {t('Dashboard.ge')}
              </span>
            <span className="font-light">{t('Dashboard.copyrightData')}</span>
            <span className="text-xl font-semibold">
                {props.data?.crTotal && props.data?.crTotal !== 0 ?
                  <Counter targetValue={props.data?.crTotal}/> : 0
                }
              {t('Dashboard.ge')}
              </span>
          </CardContent>
        </Card>
        <Card className="h-full w-full border">
          <CardHeader>
            <CardTitle>{t('Dashboard.how')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col space-y-2">
              <span className="flex items-center">
                <span className="pr-6">{t('Dashboard.starTip')}</span>
                <span className="h-px flex-1 bg-black"></span>
              </span>
            <Link href="https://github.com/besscroft/PicImpact" target="_blank">
              <Button variant="outline">
                <Star size={20} className="mr-1"/> Star
              </Button>
            </Link>
            <span className="flex items-center">
              <span className="pr-6">{t('Dashboard.issueTip')}</span>
              <span className="h-px flex-1 bg-black"></span>
              </span>
            <Link href="https://github.com/besscroft/PicImpact/issues/new" target="_blank">
              <Button variant="outline">
                <MessageSquareHeart size={20} className="mr-1"/>{t('Button.issue')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('Words.album')}</TableHead>
            <TableHead>{t('Dashboard.count')}</TableHead>
            <TableHead>{t('Dashboard.show')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {props.data?.result.map((item: any) => (
            <TableRow key={item.value}>
              <TableCell className="font-medium">{item.name}</TableCell>
              <TableCell>{Number(item?.total)}</TableCell>
              <TableCell>{Number(item?.show_total)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}