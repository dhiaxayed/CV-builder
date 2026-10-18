import { test } from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import { unzipSync, strFromU8 } from 'fflate'
import { circularPhoto } from '../../lib/pdf/photo'
import { latexPackage } from '../../lib/pdf/source'

test('wide and tall photos use a round centre crop with transparent corners',async () => {
  const pixels=Buffer.alloc(600*200*3)
  for (let y=0;y<200;y++) for (let x=0;x<600;x++) {
    pixels[(y*600+x)*3+(x<200 ? 0 : x<400 ? 2 : 1)]=255
  }
  const wide=await sharp(pixels,{ raw:{ width:600,height:200,channels:3 } }).png().toBuffer()
  const tall=await sharp(wide).rotate(90).png().toBuffer()
  for (const image of [wide,tall]) {
    const output=await circularPhoto(`data:image/png;base64,${image.toString('base64')}`)
    const { data,info }=await sharp(output).raw().toBuffer({ resolveWithObject:true })
    assert.equal(info.width,256); assert.equal(info.height,256); assert.equal(info.channels,4)
    const pixel=(x:number,y:number) => [...data.subarray((y*256+x)*4,(y*256+x)*4+4)]
    for (const [x,y] of [[0,0],[255,0],[0,255],[255,255]]) assert.equal(pixel(x,y)[3],0)
    assert.deepEqual(pixel(128,128),[0,0,255,255])
    assert.ok(pixel(2,128)[2]>240,'Centre crop must not leave portrait letterboxing')
  }
})

test('portable LaTeX package includes the exact circular image and UTF-8 source',async () => {
  const image=await sharp({ create:{ width:60,height:100,channels:3,background:'#345678' } }).jpeg().toBuffer()
  const photo=`data:image/jpeg;base64,${image.toString('base64')}`
  const source='% Jos\u00e9\n\\includegraphics{cv_photo.png}'
  const files=unzipSync(await latexPackage(source,photo))
  assert.deepEqual(Object.keys(files).sort(),['README.txt','cv.tex','cv_photo.png'])
  assert.equal(strFromU8(files['cv.tex']),source)
  assert.deepEqual(Buffer.from(files['cv_photo.png']),await circularPhoto(photo))
  await assert.rejects(circularPhoto('data:image/png;base64,aaaa'),/Unable to render/)
})
