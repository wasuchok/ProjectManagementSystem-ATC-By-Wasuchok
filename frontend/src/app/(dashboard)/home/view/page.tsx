"use client"

import { apiPrivate } from "@/app/services/apiPrivate"

const Page = () => {
    const getData = async () => {
        try {
            const response = await apiPrivate.get("/user-account/me")

            console.log(response.data)
        } catch (error) {
            console.log(error)
        }
    }

    // useEffect(() => {
    //     getData()
    // }, [])

    return (
        <>
            <div>Page</div>
            <button onClick={getData}>submit</button>
        </>
    )
}

export default Page