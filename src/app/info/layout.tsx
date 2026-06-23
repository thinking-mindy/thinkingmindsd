import { Box, Container } from "@mui/material"
import Image from "next/image";
import { auth } from '@/lib/auth/server'
import { redirect } from 'next/navigation'

export default async function InfoLayout({children}:{children:React.ReactNode}){
    const sessionClaims = (await auth()).sessionClaims;
    if (sessionClaims?.metadata?.onCompleteSetup === true) {
        redirect('/')
    }

    console.log("In layout: " + sessionClaims?.metadata?.onCompleteSetup)

    return(
        <Container>
            <Box sx={{display: 'flex',flexDirection:'column',justifyContent:'center',alignItems:'center'}}>
                <Image src="/logo.png" alt="logo" width={300} height={260} />
            </Box>
            {children}
        </Container>
    )
}

