import { useEffect, useState } from "react"

export const useDebounce = (value, delay) =>{

    const [debouncedValue, setDebouncedValue] = useState("")

    useEffect(()=>{
        const timeOut = setTimeout(()=>{
            setDebouncedValue(value)
        },delay)

        return ()=>clearTimeout(timeOut)
    },[value])

    return debouncedValue
}