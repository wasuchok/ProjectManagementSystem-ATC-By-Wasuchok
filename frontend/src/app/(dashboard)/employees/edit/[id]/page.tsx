"use client"
import { apiPrivate } from "@/app/services/apiPrivate"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
const Page = () => {
    const { id } = useParams()
    const [users, setUsers] = useState(null)

    const fetchUserById = async () => {
        try {
            const response = await apiPrivate.get(`/user-account/users/${id}`)

            console.log("User Data", response.data)
        } catch (error) {
            console.log(error)
        }
    }

    useEffect(() => {
        fetchUserById()
    }, [])
    return (
        <div>Page {id}</div>
    )
}



export default Page