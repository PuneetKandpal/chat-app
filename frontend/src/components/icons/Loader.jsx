import { LoaderCircle } from 'lucide-react'
import React from 'react'

function Loader(props) {
  return (
    <div><LoaderCircle className='animate-spin' {...props}/></div>
  )
}

export default Loader