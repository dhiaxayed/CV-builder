import { zipSync, strToU8, type Zippable } from 'fflate'
import { circularPhoto } from './photo'

/** A portable source package contains the exact image the compiler embeds. */
export async function latexPackage(latex:string, photoData?:string):Promise<Uint8Array> {
  const files:Zippable={
    'cv.tex':strToU8(latex),
    'README.txt':strToU8('Extract all files into one folder. Compile cv.tex with pdfLaTeX or Tectonic. Keep cv_photo.png next to cv.tex when present.\nThe source uses the layout and page mode validated by CV Builder.\n'),
  }
  if (photoData) files['cv_photo.png']=[await circularPhoto(photoData),{ level:0 }]
  return zipSync(files,{ level:6 })
}
